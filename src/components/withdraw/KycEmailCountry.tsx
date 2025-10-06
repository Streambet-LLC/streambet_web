import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "../ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { COUNTRIES } from "@/utils/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const countriesOptions = COUNTRIES.map(c => ({
  value: c.code,
  label: c.name,
  icon: c.emoji
}));

export type EmailCountryForm = {
  email: string;
  country: string;
};

const emailCountryFormSchema = z.object({
  email: z.string().email(),
  country: z.string(),
});

export default function KycEmailCountry({
  data,
  isSubmitting,
  onNext
} : {
  data?: EmailCountryForm;
  isSubmitting: boolean;
  onNext: (emailCountry: EmailCountryForm) => void;
}) {
  const form = useForm<EmailCountryForm>({
    resolver: zodResolver(emailCountryFormSchema),
    defaultValues: data || {
      email: "",
      country: "US",
    },
  });

  const onSubmit = (values: EmailCountryForm) => {
    if (emailCountryFormSchema.safeParse(values).success) {
      onNext(values);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-light">Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Email"
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
          name="country"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel className="text-white font-light">
                  Country
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countriesOptions.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        <div className="flex gap-2">
                          <div>{country.icon}</div>
                          <div>{country.label}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            );
          }}
        />
        <Button disabled={isSubmitting || !form.formState.isValid} type="submit" className="w-full">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Next
        </Button>
      </form>
    </Form>
  );
}