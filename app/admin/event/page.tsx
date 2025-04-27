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
    message: "Couple name must be at least 2 characters.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  date: z.date({
    required_error: "Event date is required.",
  }),
  slug: z
    .string()
    .min(2, {
      message: "Slug must be at least 2 characters.",
    })
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug can only contain lowercase letters, numbers, and hyphens.",
    }),
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
  type EventApiPayload = Omit<FormSchemaType, "date"> & { date: string };

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
      };

      // Pozovi API za kreiranje eventa
      const result = await createEvent(formattedData);

      if (result.success) {
        toast({
          title: "Event Created",
          description: "Your event has been successfully created.",
        });
        router.push("/admin/dashboard");
      } else if (result.error) {
        toast({
          title: "Greška",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "There was an error creating your event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Create Event</CardTitle>
          <CardDescription>Set up your wedding event details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="coupleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couple Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John & Jane Doe" {...field} onChange={handleCoupleNameChange} />
                    </FormControl>
                    <FormDescription>Enter the names of the couple for this event.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Grand Hotel, New York" {...field} />
                    </FormControl>
                    <FormDescription>Where will the event take place?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Event Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                    <FormDescription>Select the date when the event will take place.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event URL</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="rounded-l-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                          yoursite.com/
                        </span>
                        <Input className="rounded-l-none" placeholder="john-and-jane-wedding" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      This will be the URL for your event page. Only use lowercase letters, numbers, and hyphens.
                    </FormDescription>
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
          <p>All fields are required</p>
        </CardFooter>
      </Card>
    </div>
  )
}
