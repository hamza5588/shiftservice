import { useToast as useShadcnToast } from "../components/ui/use-toast";

export type ToastType = 'default' | 'destructive' | 'success';

export function useToast() {
  const { toast } = useShadcnToast();

  return {
    toast: ({
      title,
      description,
      variant = 'default'
    }: {
      title: string;
      description: string;
      variant?: ToastType;
    }) => {
      toast({
        title,
        description,
        variant: variant === 'success' ? 'default' : variant,
      });
    },
  };
} 