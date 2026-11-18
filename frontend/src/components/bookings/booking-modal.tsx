"use client";

import React from "react";
import type { BookingPublic, FlightOffer } from "@/lib/api/types";
import { BookingWorkflowModal } from "./booking-workflow-modal";

interface BookingModalProps {
  flight: FlightOffer | null;
  returnFlight?: FlightOffer | null;
  travellersCount?: number;
  onClose: () => void;
  onSuccess?: (booking: BookingPublic) => void;
}

export function BookingModal({
  flight,
  returnFlight,
  travellersCount = 1,
  onClose,
  onSuccess,
}: BookingModalProps) {
  if (!flight) return null;

  return (
    <BookingWorkflowModal
      flight={flight}
      returnFlight={returnFlight}
      travellersCount={travellersCount}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
