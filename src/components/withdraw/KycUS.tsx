import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "../ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { getDaysInMonth } from "date-fns";
import { useMemo } from "react";
import { US_STATES } from '@/utils/constants';
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const stateOptions = US_STATES.map(s => ({
  value: s.abbreviation,
  label: s.name
}));

export type USForm = {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dob: Date;
  ssn: string;
}

const usFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name must be at least 1 character'),
  lastName: z.string().trim().min(1, 'Last name must be at least 1 character'),
  address: z.string().trim().min(1, 'Address at least 1 character'),
  city: z.string().trim().min(1, 'City must be at least 1 character'),
  state: z
    .string()
    .transform(val => val?.replace(/^\s+/, '')) // Only trim leading spaces
    .refine(val => !val?.startsWith(' '), 'State cannot start with a space'),
  zip: z.string().trim().min(1, 'Zip Code is required'),
  dob: z.date(),
  ssn: z.string().trim().min(4, 'Last 4 digits of SSN must be 4 characters').max(4, 'Last 4 digits of SSN must be 4 characters'),
});

export default function KycUS({
  isSubmitting,
  onBack,
  onNext
} : {
  isSubmitting: boolean;
  onBack: () => void;
  onNext: (usForm: USForm) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const form = useForm<USForm>({
    resolver: zodResolver(usFormSchema),
    defaultValues: {
      dob: new Date(),
    }
  });

  const onSubmit = (values: USForm) => {
    if (usFormSchema.safeParse(values).success) {
      onNext(values);
    }
  };
  
  return (
    <Form {...form}>
      <div className="mb-4 text-sm font-semibold">Personal Information</div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-light">First name</FormLabel>
              <FormControl>
                <Input
                  placeholder="First name"
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
              <FormLabel className="text-white font-light">Last name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Last name"
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
          name="dob"
          render={({ field }) => {
            return (
              <FormItem className="flex flex-col">
                <FormLabel className="text-white font-light mb-1">
                  Birthday
                </FormLabel>
                <div className="flex gap-2">
                  <Select 
                    value={field.value.getMonth().toString()} 
                    onValueChange={(month) => {
                      const newDate = field.value;
                      newDate.setMonth(Number(month));
                      field.onChange(newDate);
                    }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {months.map((month, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={field.value.getDate().toString()} 
                    onValueChange={(date) => {
                      const newDate = field.value;
                      newDate.setDate(Number(date));
                      field.onChange(newDate);
                    }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array(getDaysInMonth(field.value)).fill("").map((_, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={field.value.getUTCFullYear().toString()} 
                    onValueChange={(year) => {
                      const newDate = field.value;
                      newDate.setUTCFullYear(Number(year));
                      field.onChange(newDate);
                    }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array(110).fill("").map((_, i) => (
                        <SelectItem key={i} value={(today.getUTCFullYear() - i).toString()}>
                          {(today.getUTCFullYear() - i).toString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-light">Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="Address"
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
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-light">City</FormLabel>
              <FormControl>
                <Input
                  placeholder="City"
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
          name="state"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel className="text-white font-light">
                  State
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stateOptions.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="zip"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-light">ZIP</FormLabel>
              <FormControl>
                <Input
                  placeholder="1234"
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
          name="ssn"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white font-light">Last 4 digits of SSN</FormLabel>
              <FormControl>
                <Input
                  placeholder="1234"
                  {...field}
                  className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                />
              </FormControl>
              <FormDescription className="text-xs">
                We require SSN to safely verify the identification. No data will be shared.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 pt-6">
          <Button disabled={isSubmitting} type="button" variant="secondary" className="flex-1" onClick={onBack}>Back</Button>
          <Button disabled={isSubmitting || !form.formState.isValid} type="submit" className="flex-1">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Next
          </Button>
        </div>
      </form>
    </Form>
  );
}