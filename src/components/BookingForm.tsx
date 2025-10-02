import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { z } from "zod";

interface BookingFormProps {
  selectedDate: Date | undefined;
  selectedSlot: string | null;
  onSuccess: () => void;
}

const bookingSchema = z.object({
  facebookName: z.string().trim().min(1, "Facebook name is required").max(100),
  address: z.string().trim().min(1, "Address is required").max(200),
  note: z.string().trim().max(500).optional(),
});

export const BookingForm = ({
  selectedDate,
  selectedSlot,
  onSuccess,
}: BookingFormProps) => {
  const [facebookName, setFacebookName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedSlot) {
      toast({
        title: "Missing information",
        description: "Please select a date and time slot",
        variant: "destructive",
      });
      return;
    }

    // Validate inputs
    const validation = bookingSchema.safeParse({
      facebookName,
      address,
      note,
    });

    if (!validation.success) {
      toast({
        title: "Invalid input",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if slot is still available
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("date", formattedDate)
        .eq("time_slot", selectedSlot)
        .eq("status", "Booked")
        .maybeSingle();

      if (existing) {
        toast({
          title: "Slot unavailable",
          description: "This time slot was just booked. Please choose another.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("bookings").insert({
        date: formattedDate,
        time_slot: selectedSlot,
        facebook_name: validation.data.facebookName,
        address: validation.data.address,
        note: validation.data.note || null,
        status: "Booked",
      });

      if (error) throw error;

      toast({
        title: "Booking confirmed! 💅",
        description: "Your nail appointment has been successfully booked.",
      });

      // Reset form
      setFacebookName("");
      setAddress("");
      setNote("");
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up">
      <div className="space-y-2">
        <Label htmlFor="facebookName" className="text-base font-medium">
          Facebook Name
        </Label>
        <Input
          id="facebookName"
          value={facebookName}
          onChange={(e) => setFacebookName(e.target.value)}
          placeholder="Enter your Facebook name"
          required
          maxLength={100}
          className="h-12 bg-card focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className="text-base font-medium">
          Address
        </Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your address"
          required
          maxLength={200}
          className="h-12 bg-card focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note" className="text-base font-medium">
          Note (Optional)
        </Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any special requests or preferences?"
          rows={4}
          maxLength={500}
          className="bg-card focus:ring-primary resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || !selectedDate || !selectedSlot}
        className="w-full h-14 text-lg font-semibold bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-soft"
      >
        <Sparkles className="mr-2 h-5 w-5" />
        {isSubmitting ? "Booking..." : "Confirm Booking"}
      </Button>
    </form>
  );
};
