"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"

// Define form schema outside component with default messages
const defaultFormSchema = (t: (key: string) => string) => z.object({
  coupleName: z.string().min(2, {
    message: 'admin.event.errors.coupleNameMin',
  }),
  location: z.string().min(2, {
    message: 'admin.event.errors.locationMin',
  }),
  date: z.date({
    required_error: 'admin.event.errors.dateRequired',
  }),
  slug: z
    .string()
    .min(2, {
      message: 'admin.event.errors.slugMin',
    })
    .regex(/^[a-z0-9-]+$/, {
      message: 'admin.event.errors.slugInvalid',
    }),
  guestMessage: z.string().max(500, { 
    message: 'admin.event.errors.guestMessageMax'
  }).optional(),
});

type FormSchemaType = z.infer<ReturnType<typeof defaultFormSchema>>;

export default function CreateEventPage() {
  const { t, i18n, ready } = useTranslation();
  
  // Debug: Log available namespaces and current language
  useEffect(() => {
    if (ready) {
      console.log('Available namespaces:', i18n.options.ns);
      console.log('Current language:', i18n.language);
      console.log('Sample translation:', t('admin.event.title'));
    }
  }, [i18n, ready, t]);
  
  // Create form schema with current translations
  const formSchema = defaultFormSchema(t);
  
  // Show loading state while translations are being loaded
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }




  const [slugError, setSlugError] = useState<string | null>(null);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for CSRF token
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfError, setCsrfError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Fetch CSRF token on mount
  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        const res = await fetch("/api/admin/events", { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error(t('admin.event.errors.csrfTokenFetch'));
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      } catch (e) {
        setCsrfError(t('admin.event.errors.csrfTokenFetch'));
      }
    };
    fetchCsrf();
  }, [t]);

  // Initialize the form with a custom error message resolver
  const form = useForm<FormSchemaType>({
    resolver: async (values, context, options) => {
      // Get the result from zod resolver
      const result = await zodResolver(formSchema)(values, context, options);
      
      // If there are errors, translate them
      if (result.errors) {
        const translatedErrors: Record<string, any> = {};
        
        for (const [key, error] of Object.entries(result.errors)) {
          if (error && typeof error === 'object' && 'message' in error) {
            translatedErrors[key] = {
              ...error,
              message: t(error.message as string)
            };
          } else {
            translatedErrors[key] = error;
          }
        }
        
        return {
          values: {},
          errors: translatedErrors
        };
      }
      
      return result;
    },
    defaultValues: {
      coupleName: "",
      location: "",
      date: undefined,
      slug: "",
      guestMessage: "",
    },
    mode: 'onChange',
  });

  // Watch the date value for debugging
  const selectedDate = form.watch('date');
  useEffect(() => {
    console.log('Selected date:', selectedDate);
  }, [selectedDate]);

  // Generate a slug from the couple name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, "") // remove accents
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with a single hyphen
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .slice(0, 50); // Limit length
  }



  // Handle couple name change to auto-generate slug
  const handleCoupleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    form.setValue("coupleName", value)

    // Only auto-generate slug if it hasn't been manually edited
    if (!slugManuallyEdited) {
      const suggestion = generateSlug(value);
      form.setValue("slug", suggestion)
    }
  }

  // Type for API payload
  type EventApiPayload = Omit<FormSchemaType, "date"> & { date: string; guestMessage?: string };

  // Call backend API to create event
  async function createEvent(data: EventApiPayload, csrfToken: string) {
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return await res.json();
  }

  // Handle form submission
  const onSubmit = async (data: FormSchemaType) => {
    if (!csrfToken) {
      setCsrfError(t('admin.event.errors.csrfTokenMissing'));
      return;
    }
    
    // Check if date is selected and valid
    if (!data.date) {
      form.setError('date', {
        type: 'required',
        message: t('admin.event.errors.dateRequired')
      });
      return;
    }
    
    // Additional validation for date format
    const dateObj = new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      form.setError('date', {
        type: 'invalid',
        message: t('admin.event.errors.invalidDate')
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      setSlugError(null);

      // Format date for API
      const formattedData: EventApiPayload = {
        ...data,
        date: new Date(data.date).toISOString(),
        guestMessage: data.guestMessage || '',
      };

      // Call API to create event
      const result = await createEvent(formattedData, csrfToken);

      if (result.success) {
        toast({
          title: t('admin.event.success.title'),
          description: t('admin.event.success.description'),
        });
        if (result.event?.id) {
          router.push(`/admin/dashboard/${result.event.id}`);
        } else {
          router.push("/admin/dashboard"); // fallback
        }
      } else if (result.error) {
        // Check for slug exists error in both languages
        const errorLower = result.error.toLowerCase();
        if (errorLower.includes('url (slug) koji ste odabrali već postoji') || 
            errorLower.includes('the url (slug) you chose already exists')) {
          setSlugError(t('admin.event.errors.slugExists'));
        } else {
          toast({
            title: t('common.error'),
            description: result.error,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: t('common.error'),
        description: t('admin.event.errors.createError'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>{t('admin.event.title')}</CardTitle>
          <CardDescription>{t('admin.event.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="coupleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.event.coupleName')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('admin.event.coupleNamePlaceholder')} 
                        {...field} 
                        onChange={e => {
                          handleCoupleNameChange(e);
                          field.onChange(e);
                          setSlugManuallyEdited(false);
                        }} 
                      />
                    </FormControl>
                    <FormDescription>{t('admin.event.coupleNameDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.event.location')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('admin.event.locationPlaceholder')} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>{t('admin.event.locationDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('admin.event.date')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>{t('admin.event.datePlaceholder')}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            // Clear any existing date errors when a date is selected
                            if (date) {
                              form.clearErrors('date');
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>{t('admin.event.dateDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => {
                  const currentCoupleName = form.getValues("coupleName");
                  const slugSuggestion = generateSlug(currentCoupleName);
                  const slugValue = field.value;
                  // Valid slug: min 3, max 50, only [a-z0-9-], no hyphens at start/end, no double hyphens
                  const slugValid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slugValue) && slugValue.length >= 3;
                  return (
                    <FormItem>
                      <FormLabel>{t('admin.event.slug')}</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <span className="rounded-l-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                            dodajuspomenu.com/
                          </span>
                          <Input
                            className="rounded-l-none"
                            placeholder={t('admin.event.slugPlaceholder')}
                            {...field}
                            value={slugValue}
                            onChange={e => {
                              field.onChange(e);
                              setSlugManuallyEdited(true);
                              setSlugError(null);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t('admin.event.slugDescription')}
                        <br />
                        <span className={`text-xs ${slugValid ? 'text-green-600' : 'text-red-600'}`}>
                          {t('admin.event.slugSuggestion', { suggestion: slugSuggestion })}
                        </span>
                      </FormDescription>
                      {!slugValid && (
                        <div className="text-xs text-red-600 mt-1">
                          {t('admin.event.slugRules')}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="guestMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.event.guestMessage')}</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full min-h-[80px] rounded border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={500}
                        placeholder={t('admin.event.guestMessagePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t('admin.event.guestMessageDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {slugError && (
                <div className="text-sm text-red-600 mb-2 text-center">{slugError}</div>
              )}
              {csrfError && (
                <div className="text-sm text-red-600 mb-2 text-center">{csrfError}</div>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !form.getValues('slug') || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.getValues('slug')) || form.getValues('slug').length < 3 || !!slugError || !csrfToken}
              >
                {isSubmitting ? t('admin.event.submittingButton') : t('admin.event.submitButton')}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <p>{t('admin.event.requiredFields')}</p>
        </CardFooter>
      </Card>
    </div>
  )
}
