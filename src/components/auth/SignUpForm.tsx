import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';

const formSchema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
    dobDay: z.string().min(1, 'Day is required'),
    dobMonth: z.string().min(1, 'Month is required'),
    dobYear: z.string().min(1, 'Year is required'),
    tosAccepted: z.boolean().refine(val => val === true, 'You must accept the Terms of Service'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    data => {
      const day = parseInt(data.dobDay);
      const month = parseInt(data.dobMonth) - 1; // JS months are 0-indexed
      const year = parseInt(data.dobYear);
      const date = new Date(year, month, day);

      // Check if it's a valid date (e.g., not Feb 30)
      const isValidDate =
        date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;

      if (!isValidDate) return false;

      // Check if user is at least 21 years old
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        return age - 1 >= 21;
      }

      return age >= 21;
    },
    {
      message: 'You must be at least 21 years old and provide a valid date',
      path: ['dobYear'],
    }
  );

export type SignUpFormData = Omit<
  z.infer<typeof formSchema>,
  'confirmPassword' | 'dobDay' | 'dobMonth' | 'dobYear'
> & {
  dateOfBirth: Date;
};

interface SignUpFormProps {
  onSubmit: (data: SignUpFormData) => Promise<void>;
  isLoading: boolean;
}

export const SignUpForm = ({ onSubmit, isLoading }: SignUpFormProps) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - 21 - i).toString());
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const [selectedMonth, setSelectedMonth] = useState<string>('1');
  const [selectedYear, setSelectedYear] = useState<string>((currentYear - 21).toString());
  const [days, setDays] = useState<string[]>([]);

  // Update days in month when month or year changes
  useEffect(() => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);

    // Get the number of days in the selected month and year
    const daysInMonth = new Date(year, month, 0).getDate();

    // Create an array of days
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());

    setDays(daysArray);
  }, [selectedMonth, selectedYear]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      dobDay: '1',
      dobMonth: '1',
      dobYear: (currentYear - 21).toString(),
      tosAccepted: false,
    },
  });

  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    // Convert separate date fields to a Date object
    const day = parseInt(values.dobDay);
    const month = parseInt(values.dobMonth) - 1; // JS months are 0-indexed
    const year = parseInt(values.dobYear);
    const dateOfBirth = new Date(year, month, day);

    // Extract date of birth fields for submission
    const { confirmPassword, dobDay, dobMonth, dobYear, ...rest } = values;

    await onSubmit({
      ...rest,
      dateOfBirth,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel className="block mb-2">Date of Birth</FormLabel>
          <div className="grid grid-cols-3 gap-2">
            <FormField
              control={form.control}
              name="dobMonth"
              render={({ field }) => (
                <FormItem>
                  <Select
                    value={field.value}
                    onValueChange={value => {
                      field.onChange(value);
                      setSelectedMonth(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {months.map(month => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dobDay"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {days.map(day => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dobYear"
              render={({ field }) => (
                <FormItem>
                  <Select
                    value={field.value}
                    onValueChange={value => {
                      field.onChange(value);
                      setSelectedYear(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-80 overflow-y-auto">
                      {years.map(year => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="tosAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>I accept the Terms of Service</FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>
    </Form>
  );
};
