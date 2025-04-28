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
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with a single hyphen
  }

  // Handle couple name change to auto-generate slug
  const handleCoupleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    form.setValue("coupleName", value)

    // Only auto-generate slug if it hasn't been manually edited
    if (!form.getValues("slug") || form.getValues("slug") === generateSlug(form.getValues("coupleName"))) {
      form.setValue("slug", generateSlug(value))
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
        toast({
          title: "Greška",
          description: result.error,
          variant: "destructive",
        });
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
                    <FormLabel>Ime i prezime paru</FormLabel>
                    <FormControl>
                      <Input placeholder="John & Jane Doe" {...field} onChange={handleCoupleNameChange} />
                    </FormControl>
                    <FormDescription>Unesite imena paru za ovaj događaj.</FormDescription>
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL koji ce te djeliti sa gostima</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="rounded-l-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                          yoursite.com/
                        </span>
                        <Input className="rounded-l-none" placeholder="john-and-jane-wedding" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      ime-mladozenje-ime-mlade (jedna od mogucnosti)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating Event..." : "Create Event"}
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
