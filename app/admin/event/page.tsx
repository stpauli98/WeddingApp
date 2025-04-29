"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ArrowLeft, CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"

// Define the form schema with Zod
const formSchema = z.object({
  coupleName: z.string().min(2, {
    message: "Ime paru mora imati najmanje 2 karaktera.",
  }),
  location: z.string().min(2, {
    message: "Lokacija mora imati najmanje 2 karaktera.",
  }),
  date: z.date({
    required_error: "Datum svadebe je obavezan.",
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
});

type FormSchemaType = z.infer<typeof formSchema>;


export default function CreateEventPage() {
  const [slugError, setSlugError] = useState<string | null>(null);
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize the form
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coupleName: "",
      location: "",
      date: undefined as unknown as Date,
      slug: "",
      guestMessage: "",
    },
  });

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

  // State to track if user manually changed slug
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

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

  // Tip za payload ka API-ju
  type EventApiPayload = Omit<FormSchemaType, "date"> & { date: string; guestMessage?: string };

  // Poziv backend API-ja za kreiranje eventa
  async function createEvent(data: EventApiPayload) {
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return await res.json();
  }

  // Handle form submission
  const onSubmit = async (data: FormSchemaType) => {
    try {
      setIsSubmitting(true)
      setSlugError(null);

      // Formatiraj date kao string za API
      const formattedData: EventApiPayload = {
        ...data,
        date: data.date.toISOString(),
        guestMessage: data.guestMessage,
      };

      // Pozovi API za kreiranje eventa
      const result = await createEvent(formattedData);

      if (result.success) {
        toast({
          title: "Događaj kreiran",
          description: "Događaj je uspešno kreiran.",
        });
        if (result.event && result.event.id) {
          router.push(`/admin/dashboard/${result.event.id}`);
        } else {
          router.push("/admin/dashboard"); // fallback
        }
      } else if (result.error) {
        if (result.error.toLowerCase().includes('url (slug) koji ste odabrali već postoji')) {
          setSlugError("URL (slug) koji ste odabrali već postoji. Molimo izaberite drugi.");
        } else {
          toast({
            title: "Greška",
            description: result.error,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Greška prilikom kreiranja događaja:", error);
      toast({
        title: "Greška",
        description: "Greška prilikom kreiranja događaja. Pokušajte ponovo.",
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
          <CardTitle>Unesite detalje događaja</CardTitle>
          <CardDescription>Unesite detalje događaja koje ćete koristiti za kreiranje vaše sličica.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="coupleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ime para (npr. Marko i Ana)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ime mladoženje i mlade" {...field} onChange={e => {
                        handleCoupleNameChange(e);
                        field.onChange(e);
                        setSlugManuallyEdited(false);
                      }} />
                    </FormControl>
                    <FormDescription>Unesite puno ime oba partnera.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokacija</FormLabel>
                    <FormControl>
                      <Input placeholder="Lokan, naziv grada" {...field} />
                    </FormControl>
                    <FormDescription>Gdje će se svadba održavati?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Datum svadebe</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Odaberite datum</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                    <FormDescription>Datum svadbe</FormDescription>
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
                  // Valid slug: min 3, max 50, samo [a-z0-9-], ne pocinje/zavrsava crticom, nema duplih crtica
                  const slugValid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slugValue) && slugValue.length >= 3;
                  return (
                    <FormItem>
                      <FormLabel>URL koji ćete dijeliti sa gostima</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <span className="rounded-l-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                            yoursite.com/
                          </span>
                          <Input
                            className="rounded-l-none"
                            placeholder="marko-i-ana-svadba"
                            {...field}
                            value={slugValue}
                            onChange={e => {
                              field.onChange(e);
                              setSlugManuallyEdited(true);
                              setSlugError(null); // resetuj grešku na izmenu
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        ime-mladozenje-ime-mlade (jedna od mogućnosti)
                        <br />
                        <span className={`text-xs ${slugValid ? 'text-green-600' : 'text-red-600'}`}>Predlog: <b>{slugSuggestion}</b></span>
                      </FormDescription>
                      {!slugValid && (
                        <div className="text-xs text-red-600 mt-1">
                          Slug mora imati najmanje 3 karaktera, može sadržati samo mala slova, brojeve i crtice (ne na početku/kraju, ne duple crtice).
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
                    <FormLabel>Poruka za goste (fun fact, dobrodošlica...)</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full min-h-[80px] rounded border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={500}
                        placeholder="Npr: Dobrodošli na našu svadbu! Očekuje vas puno iznenađenja..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Ova poruka će biti prikazana gostima na njihovom dashboardu.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {slugError && (
                <div className="text-sm text-red-600 mb-2 text-center">{slugError}</div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || !form.getValues('slug') || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.getValues('slug')) || form.getValues('slug').length < 3 || !!slugError}>
                {isSubmitting ? "Kreiram dogadja..." : "Kreiraj dogadjaj"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <p>Sva polja su obavezna</p>
        </CardFooter>
      </Card>
    </div>
  )
}
