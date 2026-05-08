import { z } from "zod";
import { MainLayout } from "./layout";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Separator } from "./ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import api from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { getMessage } from "@/utils/helper";
import { AlertCircle, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertTitle } from "./ui/alert";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email(),
  socials: z.string().optional(),
  collectorBackground: z.string().min(1, { message: "Please tell us about your collecting background" }),
  cityState: z.string().min(1, { message: "City/State is required" }),
  cardsCollected: z.string().min(1, { message: "Please tell us what cards you collect" }),
  cardPreference: z.enum(["raw", "slabbed", "both"], {
    required_error: "Please select your card preference",
  }),
  agree: z.boolean().refine((val) => val === true, {
    message: "You have to agree to CardCade terms and conditions",
  })
});

type SellerApplicationFormData = z.infer<typeof formSchema>;

export default function SellerApplication() {
  const { session } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const {
    data: application,
    isLoading,
    refetch,
  } = useQuery({
    // Include the current user id in the cache key so switching accounts
    // never shows a stale application from a previously-signed-in user.
    queryKey: ['seller-application', session?.id ?? null],
    enabled: !!session?.id,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      // The API returns the application entity directly (not wrapped in
      // a `data` envelope). Accept either shape so we don't silently fall
      // back to "no application" on submit/refresh.
      const response = await api.creator.getCreatorApplication();
      const application = response?.data ?? response;
      if (application && application.applicationType === 'seller') {
        return application;
      }
      return null;
    },
  });

  const form = useForm<SellerApplicationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      socials: '',
      collectorBackground: '',
      cityState: '',
      cardsCollected: '',
      cardPreference: undefined,
      agree: false,
    },
    mode: 'onChange',
  });

  const handleSubmit = async (data: SellerApplicationFormData) => {
    try {
      // Don't allow updates - user must cancel and resubmit
      if (application) {
        return;
      }

      setSubmitting(true);

      const { agree, ...payload } = data;

      const requestPayload = {
        ...payload,
        applicationType: 'seller',
      };

      await api.creator.createCreatorApplication(requestPayload);
      toast({ title: 'Success', description: 'Seller application submitted.' });

      await queryClient.invalidateQueries({ queryKey: ['seller-application'] });

      // Hard refresh so the user immediately sees the pending state.
      window.location.reload();
    } catch (err) {
      toast({
        title: 'Error',
        description: getMessage(err) || 'Failed to create seller application',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      setShowCancelDialog(false);

      if (!application) return;

      setSubmitting(true);

      await api.creator.cancelCreatorApplication();

      toast({ title: 'Success', description: 'Seller application cancelled.' });

      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        socials: "",
        collectorBackground: "",
        cityState: "",
        cardsCollected: "",
        cardPreference: undefined,
        agree: false,
      });

      await queryClient.invalidateQueries({ queryKey: ["seller-application"] });
    } catch (err) {
      toast({
        title: 'Error',
        description: getMessage(err) || 'Failed to cancel seller application',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (application) {
      form.reset({
        firstName: application.firstName || "",
        lastName: application.lastName || "",
        email: application.email || session?.email || "",
        socials: application.socials || "",
        collectorBackground: application.collectorBackground || "",
        cityState: application.cityState || "",
        cardsCollected: application.cardsCollected || "",
        cardPreference: application.cardPreference || undefined,
        agree: true
      });

      return;
    }

    if (session?.email) {
      form.setValue("email", session.email);
    }
  }, [session, application]);

  return (
    <MainLayout showFooter>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="text-xl font-bold">Seller Application</div>
          <div className="text-sm text-weak">Apply here to sell your trading cards on the CardCade marketplace! Share your collection with our community and turn your passion into profit.</div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {!!application &&
            <Alert variant="default" className="flex flex-col gap-2 mb-2">
              <AlertTitle className="text-sm text-green-500">
                Your seller application has been submitted and is being reviewed!
              </AlertTitle>
              <Button disabled={submitting} variant="secondary" size="sm" className="w-fit" onClick={() => setShowCancelDialog(true)}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle />}
                Cancel Application
              </Button>
            </Alert>}
          {isLoading ?
            <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light">First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          maxLength={100}
                          disabled={!!application}
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light">Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          maxLength={100}
                          disabled={!!application}
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="johndoe@email.com"
                          maxLength={255}
                          disabled={!!application}
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="socials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light">If you're active with any social media trading cards / related accounts, please share links here (e.g. instagram, tiktok, twitter, etc.)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Instagram: @username, TikTok: @username, etc."
                          maxLength={500}
                          rows={2}
                          disabled={!!application}
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="collectorBackground"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light">Tell us a little about you as a collector and how long you've been collecting/trading</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="I've been collecting sports cards for 10 years and specialize in..."
                          maxLength={1000}
                          rows={4}
                          disabled={!!application}
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cityState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light">What city/state are you in?</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Los Angeles, CA"
                          maxLength={255}
                          disabled={!!application}
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cardsCollected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light">What cards do you predominantly collect?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Pokemon, sports cards, basketball rookies, etc."
                          maxLength={1000}
                          rows={3}
                          disabled={!!application}
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cardPreference"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-white font-light">Do you predominately do raw cards or slabbed?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!application}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="raw" className="border-white text-white" />
                            </FormControl>
                            <FormLabel className="font-normal text-white">
                              Raw Cards
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="slabbed" className="border-white text-white" />
                            </FormControl>
                            <FormLabel className="font-normal text-white">
                              Slabbed Cards
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="both" className="border-white text-white" />
                            </FormControl>
                            <FormLabel className="font-normal text-white">
                              Both
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agree"
                  render={({ field }) => (
                    <FormItem className="flex-col items-center">
                      <FormControl className="mr-2">
                        <Checkbox
                          name={field.name}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!!application}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormLabel className="text-white font-light">
                        I agree to the CardCade {" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          terms and conditions
                        </a>
                        .
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          }
        </CardContent>
        {!application && (
          <CardFooter>
            <Button
              className="w-full"
              onClick={form.handleSubmit(handleSubmit)}
              disabled={submitting || !form.formState.isValid}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Submitting" : "Submit"}
            </Button>
          </CardFooter>
        )}
      </Card>
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className='border-2 border-[#7AFF14] max-w-[40vw] max-h-[80vh] w-fit h-fit overflow-auto' style={{ background: '#0D0D0D' }}>
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Cancel Seller Application</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to cancel your seller application?
          </DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">No</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleCancel}>
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
