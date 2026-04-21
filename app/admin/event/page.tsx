"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, Check, Loader2, X } from "lucide-react"
import { format } from "date-fns"
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { PricingTierSelector } from "@/components/admin/PricingTierSelector"
import { PRICING_TIERS, PricingTier } from "@/lib/pricing-tiers"
import { cn } from "@/lib/utils"

// Define the form schema with Zod
const formSchema = z.object({
  coupleName: z.string().min(2, {
    message: "Ime paru mora imati najmanje 2 karaktera.",
  }).max(100, {
    message: "Ime para može imati najviše 100 karaktera.",
  }),
  location: z.string().min(2, {
    message: "Lokacija mora imati najmanje 2 karaktera.",
  }),
  date: z.date({
    required_error: "Datum svadebe je obavezan.",
  }).refine((date) => date > new Date(), {
    message: "Datum mora biti u budućnosti.",
  }),
  slug: z
    .string()
    .min(2, {
      message: "Slug mora imati najmanje 2 karaktera.",
    })
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug može sadržati samo mala slova, brojeve i crtica.",
    }),
  guestMessage: z.string().max(500, { message: "Poruka za goste može imati najviše 500 karaktera." }).optional(),
  pricingTier: z.enum(["free", "basic", "premium"]).default("free"),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function CreateEventPage() {
  // Svi React Hooks moraju biti pozvani na vrhu komponente
  const { t, i18n, ready } = useTranslation();
  const router = useRouter();
  
  // State hooks
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfError, setCsrfError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  
  // Initialize the form - mora biti prije uvjetnog renderiranja
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coupleName: "",
      location: "",
      date: undefined as unknown as Date,
      slug: "",
      guestMessage: "",
      pricingTier: "free",
    },
    mode: 'onChange',
  });
  
  
  // Fetch CSRF token on mount and load draft from localStorage
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

    // Load draft from localStorage
    const draft = localStorage.getItem('eventDraft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft.coupleName) form.setValue('coupleName', parsedDraft.coupleName);
        if (parsedDraft.location) form.setValue('location', parsedDraft.location);
        if (parsedDraft.date) {
          // Parse YYYY-MM-DD string as local date
          const [year, month, day] = parsedDraft.date.split('-').map(Number);
          form.setValue('date', new Date(year, month - 1, day));
        }
        if (parsedDraft.slug) form.setValue('slug', parsedDraft.slug);
        if (parsedDraft.guestMessage) form.setValue('guestMessage', parsedDraft.guestMessage);
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, [t, form]);

  // Auto-save draft to localStorage
  useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        const draft = {
          coupleName: values.coupleName,
          location: values.location,
          date: values.date ? format(values.date as Date, 'yyyy-MM-dd') : undefined,
          slug: values.slug,
          guestMessage: values.guestMessage,
        };
        localStorage.setItem('eventDraft', JSON.stringify(draft));
      } catch (e) {
        // localStorage full or unavailable
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const watchedSlug = useWatch({ control: form.control, name: 'slug' });
  // Check slug availability with debounce
  useEffect(() => {
    const slug = watchedSlug;
    if (!slug || slug.length < 3 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      setSlugAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const response = await fetch(`/api/admin/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await response.json();
        setSlugAvailable(data.available);
      } catch (error) {
        console.error('Error checking slug:', error);
      } finally {
        setSlugChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedSlug]);

  // Show loading state while translations are being loaded
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

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
  type EventApiPayload = Omit<FormSchemaType, "date"> & {
    date: string;
    guestMessage?: string;
    pricingTier: string;
    imageLimit: number;
  };

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

      // Format date for API (YYYY-MM-DD to avoid timezone issues)
      const selectedTier = data.pricingTier || 'free';
      const imageLimit = PRICING_TIERS[selectedTier].imageLimit;

      const formattedData: EventApiPayload = {
        ...data,
        date: format(data.date, 'yyyy-MM-dd'),
        guestMessage: data.guestMessage || '',
        pricingTier: selectedTier,
        imageLimit: imageLimit,
      };

      // Call API to create event
      const result = await createEvent(formattedData, csrfToken);

      if (result.success) {
        // Clear draft from localStorage on success
        localStorage.removeItem('eventDraft');

        toast({
          title: t('admin.event.success.title'),
          description: t('admin.event.success.description'),
        });
        // Dohvati trenutni jezik iz i18n
        const currentLang = i18n.language || 'sr';

        if (result.event?.id) {
          router.push(`/${currentLang}/admin/dashboard/${result.event.id}`);
        } else {
          router.push(`/${currentLang}/admin/dashboard`); // fallback
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
    <main className="min-h-screen bg-[hsl(var(--lp-bg))] px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-2xl">
        <FadeInUp>
          <header className="mb-8 text-center sm:mb-10 lg:mb-12">
            <span className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--lp-accent))]">
              {t('admin.event.eyebrow')}
            </span>
            <h1 className="font-playfair text-3xl leading-tight text-[hsl(var(--lp-text))] sm:text-4xl lg:text-5xl">
              {t('admin.event.title')}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-[hsl(var(--lp-muted-foreground))] sm:text-base">
              {t('admin.event.description')}
            </p>
          </header>
        </FadeInUp>
        <FadeInUp delay={0.15}>
          <Card className="border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-card))] shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6 sm:p-8 lg:p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="coupleName"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-sm font-medium text-[hsl(var(--lp-text))]">{t('admin.event.coupleName')}</FormLabel>
                      <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">
                        {t('admin.event.coupleNameCounter', { count: field.value?.length || 0 })}
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        placeholder={t('admin.event.coupleNamePlaceholder')}
                        maxLength={100}
                        className="border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-card))] text-[hsl(var(--lp-text))] focus-visible:ring-[hsl(var(--lp-primary))] focus-visible:ring-offset-0"
                        {...field}
                        onChange={e => {
                          handleCoupleNameChange(e);
                          field.onChange(e);
                          setSlugManuallyEdited(false);
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-[hsl(var(--lp-muted-foreground))]">{t('admin.event.coupleNameDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-[hsl(var(--lp-text))]">{t('admin.event.location')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('admin.event.locationPlaceholder')}
                        className="border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-card))] text-[hsl(var(--lp-text))] focus-visible:ring-[hsl(var(--lp-primary))] focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-[hsl(var(--lp-muted-foreground))]">{t('admin.event.locationDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium text-[hsl(var(--lp-text))]">{t('admin.event.date')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-card))] pl-3 text-left font-normal hover:bg-[hsl(var(--lp-muted))]/30",
                              !field.value && "text-[hsl(var(--lp-muted-foreground))]"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>{t('admin.event.datePlaceholder')}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 text-[hsl(var(--lp-accent))]" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription className="text-xs text-[hsl(var(--lp-muted-foreground))]">{t('admin.event.dateDescription')}</FormDescription>
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
                      <FormLabel className="text-sm font-medium text-[hsl(var(--lp-text))]">{t('admin.event.slug')}</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <span className="inline-flex items-center rounded-l-md border border-r-0 border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-muted))] px-3 py-2 text-sm text-[hsl(var(--lp-muted-foreground))]">
                            dodajuspomenu.com/
                          </span>
                          <Input
                            className="rounded-l-none border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-card))] text-[hsl(var(--lp-text))] focus-visible:ring-[hsl(var(--lp-primary))] focus-visible:ring-offset-0"
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
                      <FormDescription className="text-xs text-[hsl(var(--lp-muted-foreground))]">
                        {t('admin.event.slugDescription')}
                      </FormDescription>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "text-xs italic",
                          slugValid ? "text-[hsl(var(--lp-success))]" : "text-[hsl(var(--lp-muted-foreground))]"
                        )}>
                          {t('admin.event.slugSuggestion', { suggestion: slugSuggestion })}
                        </span>
                        <div aria-live="polite" className="inline-flex">
                          {slugChecking && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--lp-muted))] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--lp-muted-foreground))]">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {t('admin.event.errors.slugChecking')}
                            </span>
                          )}
                          {!slugChecking && slugAvailable === true && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--lp-success))]/10 px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--lp-success))]">
                              <Check className="h-3 w-3" />
                              {t('admin.event.errors.slugAvailable')}
                            </span>
                          )}
                          {!slugChecking && slugAvailable === false && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--lp-destructive))]/10 px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--lp-destructive))]">
                              <X className="h-3 w-3" />
                              {t('admin.event.errors.slugTaken')}
                            </span>
                          )}
                        </div>
                      </div>
                      {!slugValid && (
                        <div className="mt-1 text-xs text-[hsl(var(--lp-destructive))]">
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
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-sm font-medium text-[hsl(var(--lp-text))]">{t('admin.event.guestMessage')}</FormLabel>
                      <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">
                        {t('admin.event.guestMessageCounter', { count: field.value?.length || 0 })}
                      </span>
                    </div>
                    <FormControl>
                      <textarea
                        className="w-full min-h-[96px] rounded-md border border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-card))] px-3 py-2 text-base text-[hsl(var(--lp-text))] placeholder:text-[hsl(var(--lp-muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--lp-primary))] focus:ring-offset-0"
                        maxLength={500}
                        placeholder={t('admin.event.guestMessagePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-[hsl(var(--lp-muted-foreground))]">{t('admin.event.guestMessageDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pricing Tier Selector */}
              <FormField
                control={form.control}
                name="pricingTier"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <PricingTierSelector
                      selectedTier={field.value as PricingTier}
                      onTierChange={field.onChange}
                      language={i18n.language as 'sr' | 'en'}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {slugError && (
                <div role="alert" className="rounded-md border border-[hsl(var(--lp-destructive))]/30 bg-[hsl(var(--lp-destructive))]/10 px-4 py-2.5 text-center text-sm text-[hsl(var(--lp-destructive))]">
                  {slugError}
                </div>
              )}
              {csrfError && (
                <div role="alert" className="rounded-md border border-[hsl(var(--lp-destructive))]/30 bg-[hsl(var(--lp-destructive))]/10 px-4 py-2.5 text-center text-sm text-[hsl(var(--lp-destructive))]">
                  {csrfError}
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))] shadow-sm transition-all hover:bg-[hsl(var(--lp-primary))]/90 hover:shadow-md disabled:bg-[hsl(var(--lp-muted))] disabled:text-[hsl(var(--lp-muted-foreground))] disabled:shadow-none"
                disabled={isSubmitting || slugChecking || slugAvailable === false || !form.getValues('slug') || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.getValues('slug')) || form.getValues('slug').length < 3 || !!slugError || !csrfToken}
              >
                {isSubmitting ? t('admin.event.submittingButton') : t('admin.event.submitButton')}
              </Button>
            </form>
          </Form>
            </CardContent>
            <CardFooter className="border-t border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-bg))]/50 px-6 py-4 text-sm text-[hsl(var(--lp-muted-foreground))] sm:px-8">
              <p>{t('admin.event.requiredFields')}</p>
            </CardFooter>
          </Card>
        </FadeInUp>
      </div>
    </main>
  )
}
