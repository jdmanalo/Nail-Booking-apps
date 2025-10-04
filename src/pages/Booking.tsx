import { useState } from "react";
import { BookingDatePicker } from "@/components/BookingDatePicker";
import { TimeSlotSelector } from "@/components/TimeSlotSelector";
import { BookingForm } from "@/components/BookingForm";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Booking = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleSuccess = () => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Wanderlust by Mae
            </h1>
          </div>
          {/* <p className="text-lg text-muted-foreground mt-2">
            Book Your Nail Appointment and Choose your preferred date and time for beautiful nails
          </p> */}
        </div>

        {/* Booking Form */}
        <Card className="p-8 shadow-elegant bg-card/80 backdrop-blur-sm">
          <div className="space-y-8">
            {/* Date Selection */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
                  1
                </span>
                Select Date
              </h2>
              <BookingDatePicker date={selectedDate} onDateChange={setSelectedDate} />
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
                  2
                </span>
                Choose Time Slot
              </h2>
              <TimeSlotSelector
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onSlotChange={setSelectedSlot}
              />
            </div>

            {/* User Details */}
            {selectedSlot && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
                    3
                  </span>
                  Your Details
                </h2>
                <BookingForm
                  selectedDate={selectedDate}
                  selectedSlot={selectedSlot}
                  onSuccess={handleSuccess}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Admin Link */}
        <div className="mt-8 text-center">
          <Link to="/auth">
            <Button variant="ghost" className="text-muted-foreground hover:text-primary">
              Admin Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Booking;
