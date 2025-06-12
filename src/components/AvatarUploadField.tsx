import { AvatarUpload } from '@/components/ui/avatar-upload';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';

interface AvatarUploadFieldProps {
  form: UseFormReturn<any>;
  name: string;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const AvatarUploadField = ({
  form,
  name,
  label = 'Profile Picture',
  disabled = false,
  size = 'md',
}: AvatarUploadFieldProps) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <AvatarUpload
              value={field.value}
              onClear={() => form.clearErrors(name)}
              onChange={file => {
                if (file) {
                  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                    form.setError(name, {
                      type: 'manual',
                      message: 'Please upload a valid image file (JPEG, PNG, or WebP)',
                    });
                    return;
                  }
                  if (file.size > MAX_FILE_SIZE) {
                    form.setError(name, {
                      type: 'manual',
                      message: 'File size must be less than 2 MB',
                    });
                    return;
                  }
                  form.clearErrors(name);
                }
                field.onChange(file);
              }}
              disabled={disabled}
              size={size}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
