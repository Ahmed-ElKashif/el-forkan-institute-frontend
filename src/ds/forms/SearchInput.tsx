import { Input, type InputProps } from './Input';
import { cn } from '../cn';

export type SearchInputProps = Omit<InputProps, 'icon' | 'type'>;

/** Search field for student and section lists.
 *  Arabic name normalisation happens upstream in the API, not here. */
export function SearchInput({
  placeholder = 'بحث بالاسم أو الكود',
  className,
  ...rest
}: SearchInputProps) {
  return (
    <Input
      type="search"
      icon="search"
      placeholder={placeholder}
      className={cn('min-w-60', className)}
      {...rest}
    />
  );
}
