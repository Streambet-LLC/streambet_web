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
import { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

const formSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  socials: z.string().min(1),
  message: z.string().min(1),
  agree: z.boolean(),
});

type CreatorJoinFormData = z.infer<typeof formSchema>;

export default function CreatorJoin() {
  const { session } = useAuthContext();
  const form = useForm<CreatorJoinFormData>({
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


  const handleSubmit = () => {

  };

  useEffect(() => {
    if (session && session.email) {
      form.setValue("email", session.email);
    }
  }, [session]);

  return (
    <MainLayout showFooter>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="text-xl font-bold">Streambet Creator Program & Monetization Application</div>
          <div className="text-sm text-weak">Apply here to run your own livestream on the Streambet platform and get a % of the platform's earnings! Engage your audience and make money at the same time!</div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
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
                    <FormLabel className="text-white font-light">Share about yourself. Why livestream on Streambet? What content do you make?</FormLabel>
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
                  <FormItem className="flex items-center">
                    <FormControl className="mr-2">
                      <Checkbox
                        name={field.name}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                      />
                    </FormControl>
                    <FormLabel className="text-white font-light">
                      I agree to the Streambet {" "}
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
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={!form.formState.isValid}
          >
            Submit
          </Button>
        </CardFooter>
      </Card>
    </MainLayout>
  )
}