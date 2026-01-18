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
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertTitle } from "./ui/alert";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email(),
  socials: z.string().min(1, { message: "Socials are required" }),
  message: z.string().min(1, { message: "Please fill out a message for your application" }),
  agree: z.boolean().refine((val) => val === true, {
    message: "You have to agree to Streambet terms and conditions",
  })
});

type CreatorApplicationFormData = z.infer<typeof formSchema>;

export default function CreatorApplication() {
  const { session } = useAuthContext();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: application, isLoading, refetch } = useQuery({
    queryKey: ["creator-application"],
    queryFn: async () => {
      const data = await api.creator.getCreatorApplication();

      return data.data;
    },
  });

  const form = useForm<CreatorApplicationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      socials: "",
      message: "",
      agree: false,
    },
    mode: 'onChange',
  });

  const handleSubmit = async (data: CreatorApplicationFormData) => {
    try {
      setSubmitting(true);

      const { agree, ...payload } = data;

      if (application) {
        await api.creator.updateCreatorApplication(payload);
        toast({ title: 'Success', description: 'Creator application updated.' });
      } else {
        await api.creator.createCreatorApplication(payload);
        toast({ title: 'Success', description: 'Creator application submitted.' });
      }


      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: getMessage(err) || 'Failed to create creator application',
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

      toast({ title: 'Success', description: 'Creator application cancelled.' });

      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        socials: "",
        message: "",
        agree: false,
      });

      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: getMessage(err) || 'Failed to cancel creator application',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (application) {
      form.reset({
        ...application,
        agree: true
      });

      return;
    }

    if (session && session.email) {
      form.setValue("email", session.email);
    }
  }, [session, application]);

  return (
    <MainLayout showFooter>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="text-xl font-bold">Creator Program & Monetization Application</div>
          <div className="text-sm text-weak">Apply here to run your own livestream on the CardCade platform and get a % of the platform's earnings! Engage your audience and make money at the same time!</div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {!!application &&
            <Alert variant="default" className="flex flex-col gap-2 mb-2">
              <AlertTitle className="text-sm text-green-500">
                Your creator application has been submitted and is being reviewed!
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
                      <FormLabel className="text-white font-light">What are your social handles?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tik Tok, Instagram, YouTube, etc."
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
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light">Share about yourself. Why livestream on CardCade? What content do you make?</FormLabel>
                      <FormControl>
                        <Textarea
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
                  name="agree"
                  render={({ field }) => (
                    <FormItem className="flex-col items-center">
                      <FormControl className="mr-2">
                        <Checkbox
                          name={field.name}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormLabel className="text-white font-light">
                        I agree to the CardCade {" "}
                        <a
                          href="https://discord.gg/Pnm5yXbu8h"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Discord"
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
        <CardFooter>
          <Button
            className="w-full"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={submitting || !form.formState.isValid}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Submitting" : !!application ? "Update" : "Submit"}
          </Button>
        </CardFooter>
      </Card>
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className='border-2 border-[#7AFF14] max-w-[40vw] max-h-[80vh] w-fit h-fit overflow-auto' style={{ background: '#0D0D0D' }}>
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Cancel Creator Application</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to cancel your creator application?
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