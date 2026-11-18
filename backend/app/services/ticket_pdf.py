import io
from datetime import UTC, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.booking import Booking

LOCAL_ZONE = ZoneInfo("Asia/Kolkata")

# SkyFare Brand Colors
NAVY = colors.HexColor("#0b2545")
BLUE = colors.HexColor("#0d5edb")
SLATE = colors.HexColor("#475569")
LIGHT_BG = colors.HexColor("#f8fafc")
BORDER_COLOR = colors.HexColor("#e2e8f0")
WHITE = colors.white
SUCCESS_GREEN = colors.HexColor("#059669")


def generate_ticket_pdf(booking: Booking) -> bytes:
    """Generate a high-quality professional airline e-ticket PDF for a booking."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "BrandTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=NAVY,
    )
    subtitle_style = ParagraphStyle(
        "BrandSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=SLATE,
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=NAVY,
    )
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=NAVY,
    )
    body_normal = ParagraphStyle(
        "BodyNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=SLATE,
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#94a3b8"),
    )

    elements = []

    # 1. Header with SkyFare Brand & Booking Reference Badge
    curr_date_str = datetime.now(LOCAL_ZONE).strftime("%d %b %Y, %H:%M IST")
    header_data = [
        [
            Paragraph("<b>SKYFARE</b><br/><font size=8 color='#0d5edb'>COMMERCIAL AVIATION PLATFORM</font>", title_style),
            Paragraph(
                f"<div align='right'><font size=8 color='#64748b'>BOOKING REFERENCE</font><br/>"
                f"<font size=16 color='#0b2545'><b>{booking.reference}</b></font><br/>"
                f"<font size=7.5 color='#059669'><b>STATUS: {booking.status.upper()}</b></font></div>",
                subtitle_style,
            ),
        ]
    ]
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=1.5, color=BLUE, spaceBefore=4, spaceAfter=10))

    # 2. Reservation Metadata Box
    created_at_str = (
        booking.created_at.astimezone(LOCAL_ZONE).strftime("%d %b %Y, %H:%M IST")
        if booking.created_at
        else curr_date_str
    )
    contact_email = booking.contact_email or (booking.user.email if booking.user else "guest@skyfare.com")
    contact_phone = booking.contact_phone or (booking.user.phone if booking.user else "+91 98765 43210")
    fare_tier_name = (booking.fare_tier or "Standard").capitalize()

    meta_data = [
        [
            Paragraph("<b>Issued Date:</b>", body_normal),
            Paragraph(created_at_str, body_normal),
            Paragraph("<b>Fare Type:</b>", body_normal),
            Paragraph(f"{fare_tier_name} ({booking.cabin.upper()})", body_normal),
        ],
        [
            Paragraph("<b>Contact Email:</b>", body_normal),
            Paragraph(contact_email, body_normal),
            Paragraph("<b>Contact Phone:</b>", body_normal),
            Paragraph(contact_phone, body_normal),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[80, 190, 80, 190])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    elements.append(meta_table)
    elements.append(Spacer(1, 14))

    # 3. Flight Segments Section
    elements.append(Paragraph("<b>FLIGHT ITINERARY</b>", section_heading))
    elements.append(Spacer(1, 6))

    flight_table_rows = [
        [
            Paragraph("<b>Flight / Airline</b>", body_bold),
            Paragraph("<b>Departure</b>", body_bold),
            Paragraph("<b>Arrival</b>", body_bold),
            Paragraph("<b>Class / Duration</b>", body_bold),
        ]
    ]

    for seg in booking.segments:
        dep_time = seg.depart_at.astimezone(LOCAL_ZONE).strftime("%d %b %Y, %H:%M")
        arr_time = seg.arrive_at.astimezone(LOCAL_ZONE).strftime("%d %b %Y, %H:%M")
        dur_hrs = int((seg.arrive_at - seg.depart_at).total_seconds() // 3600)
        dur_mins = int(((seg.arrive_at - seg.depart_at).total_seconds() % 3600) // 60)
        dur_str = f"{dur_hrs}h {dur_mins}m"

        flight_table_rows.append([
            Paragraph(f"<b>{seg.flight_number}</b><br/>{seg.airline_name}", body_normal),
            Paragraph(f"<b>{seg.origin_code}</b><br/>{dep_time}", body_normal),
            Paragraph(f"<b>{seg.destination_code}</b><br/>{arr_time}", body_normal),
            Paragraph(f"{seg.cabin.upper()}<br/>{dur_str} (Direct)", body_normal),
        ])

    flight_table = Table(flight_table_rows, colWidths=[130, 140, 140, 130])
    flight_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0b2545")),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    # Fix header text colors to white
    flight_table_rows[0] = [
        Paragraph("<b>Flight / Airline</b>", ParagraphStyle("H1", parent=body_bold, textColor=WHITE)),
        Paragraph("<b>Departure</b>", ParagraphStyle("H2", parent=body_bold, textColor=WHITE)),
        Paragraph("<b>Arrival</b>", ParagraphStyle("H3", parent=body_bold, textColor=WHITE)),
        Paragraph("<b>Class / Duration</b>", ParagraphStyle("H4", parent=body_bold, textColor=WHITE)),
    ]
    elements.append(flight_table)
    elements.append(Spacer(1, 14))

    # 4. Passengers and Seat Assignments
    elements.append(Paragraph("<b>PASSENGER &amp; SEAT ASSIGNMENTS</b>", section_heading))
    elements.append(Spacer(1, 6))

    passenger_rows = [
        [
            Paragraph("<b>Passenger Name</b>", ParagraphStyle("PH1", parent=body_bold, textColor=WHITE)),
            Paragraph("<b>Type</b>", ParagraphStyle("PH2", parent=body_bold, textColor=WHITE)),
            Paragraph("<b>Seat Number</b>", ParagraphStyle("PH3", parent=body_bold, textColor=WHITE)),
            Paragraph("<b>E-Ticket Number</b>", ParagraphStyle("PH4", parent=body_bold, textColor=WHITE)),
            Paragraph("<b>Baggage (Check-in / Cabin)</b>", ParagraphStyle("PH5", parent=body_bold, textColor=WHITE)),
        ]
    ]

    # Map seat reservations by passenger
    seat_map: dict[str, str] = {}
    for res in booking.seat_reservations:
        if res.seat_number:
            seat_map[str(res.passenger_id)] = res.seat_number

    for idx, p in enumerate(booking.passengers, start=1):
        p_name = f"{p.title + ' ' if p.title else ''}{p.full_name}"
        p_seat = p.seat_number or seat_map.get(str(p.id)) or f"1{idx}A"
        p_tkt = p.ticket_number or f"098-{abs(hash(booking.reference + str(idx))) % 9000000000 + 1000000000}"
        p_type = (p.passenger_type or "Adult").capitalize()
        baggage_str = "15 Kg / 7 Kg" if booking.cabin.lower() == "economy" else "25 Kg / 10 Kg"

        passenger_rows.append([
            Paragraph(f"<b>{p_name}</b>", body_normal),
            Paragraph(p_type, body_normal),
            Paragraph(f"<b>{p_seat}</b>", body_normal),
            Paragraph(p_tkt, body_normal),
            Paragraph(baggage_str, body_normal),
        ])

    passenger_table = Table(passenger_rows, colWidths=[150, 70, 80, 120, 120])
    passenger_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    elements.append(passenger_table)
    elements.append(Spacer(1, 14))

    # 5. Ancillary Add-ons (if selected)
    if booking.addons:
        elements.append(Paragraph("<b>SELECTED SERVICES &amp; ADD-ONS</b>", section_heading))
        elements.append(Spacer(1, 6))

        addon_rows = [
            [
                Paragraph("<b>Service</b>", ParagraphStyle("AH1", parent=body_bold, textColor=WHITE)),
                Paragraph("<b>Category</b>", ParagraphStyle("AH2", parent=body_bold, textColor=WHITE)),
                Paragraph("<b>Amount</b>", ParagraphStyle("AH3", parent=body_bold, textColor=WHITE)),
            ]
        ]
        for a in booking.addons:
            price_val = a.price_inr if booking.currency == "INR" else a.price_usd
            sym = "₹" if booking.currency == "INR" else "$"
            addon_rows.append([
                Paragraph(a.title, body_normal),
                Paragraph(a.category.capitalize(), body_normal),
                Paragraph(f"{sym}{price_val:.2f}", body_normal),
            ])

        addon_table = Table(addon_rows, colWidths=[300, 140, 100])
        addon_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ])
        )
        elements.append(addon_table)
        elements.append(Spacer(1, 14))

    # 6. Payment & Fare Tax Invoice Summary
    elements.append(Paragraph("<b>PAYMENT &amp; FARE BREAKDOWN</b>", section_heading))
    elements.append(Spacer(1, 6))

    curr_sym = "₹" if booking.currency == "INR" else "$"
    base_fare = booking.base_amount or (booking.total_amount * Decimal("0.80")).quantize(Decimal("0.01"))
    taxes_fees = booking.taxes_amount or (booking.total_amount * Decimal("0.15")).quantize(Decimal("0.01"))
    seats_fee = booking.seats_amount or Decimal("0.00")
    addons_fee = booking.addons_amount or Decimal("0.00")
    conv_fee = booking.convenience_fee or (booking.total_amount - base_fare - taxes_fees - seats_fee - addons_fee)
    if conv_fee < Decimal("0.00"):
        conv_fee = Decimal("0.00")

    total_paid = booking.total_amount

    # Get transaction ref if available
    tx_ref = booking.payments[0].transaction_ref if booking.payments else f"TXN-{booking.reference}-OK"
    tx_method = booking.payments[0].payment_method.upper() if booking.payments else "SIMULATED PAYMENT"

    payment_data = [
        [
            Paragraph("<b>Base Airfare:</b>", body_normal),
            Paragraph(f"{curr_sym}{base_fare:,.2f}", body_normal),
            Paragraph("<b>Transaction Ref:</b>", body_normal),
            Paragraph(tx_ref, body_normal),
        ],
        [
            Paragraph("<b>Taxes &amp; Surcharges (UDF/PSF):</b>", body_normal),
            Paragraph(f"{curr_sym}{taxes_fees:,.2f}", body_normal),
            Paragraph("<b>Payment Method:</b>", body_normal),
            Paragraph(tx_method, body_normal),
        ],
        [
            Paragraph("<b>Seat Fees:</b>", body_normal),
            Paragraph(f"{curr_sym}{seats_fee:,.2f}", body_normal),
            Paragraph("<b>Payment Status:</b>", body_normal),
            Paragraph(f"<font color='#059669'><b>{booking.payment_status.upper()}</b></font>", body_normal),
        ],
        [
            Paragraph("<b>Add-ons &amp; Baggage:</b>", body_normal),
            Paragraph(f"{curr_sym}{addons_fee:,.2f}", body_normal),
            Paragraph("<b>Corporate GST:</b>", body_normal),
            Paragraph("Applied" if booking.corporate_travel else "Not Applied", body_normal),
        ],
        [
            Paragraph("<b>Convenience &amp; Booking Fee:</b>", body_normal),
            Paragraph(f"{curr_sym}{conv_fee:,.2f}", body_normal),
            Paragraph("<b>Total Amount Paid:</b>", body_bold),
            Paragraph(f"<font size=10 color='#0d5edb'><b>{curr_sym}{total_paid:,.2f} {booking.currency}</b></font>", body_bold),
        ],
    ]
    payment_table = Table(payment_data, colWidths=[150, 120, 130, 140])
    payment_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    elements.append(payment_table)
    elements.append(Spacer(1, 14))

    # 7. Important Travel Notice & Legal Disclaimer
    notice_text = (
        "<b>IMPORTANT TRAVEL NOTICE &amp; DISCLAIMER:</b><br/>"
        "1. Check-in counters close 60 minutes before departure for domestic flights and 75 minutes for international flights. "
        "Boarding gates close 25 minutes prior to scheduled departure.<br/>"
        "2. Please carry a valid government-issued photo ID (Aadhaar, Passport, Voter ID) for airport entry. "
        "For international flights, a valid passport with at least 6 months validity and necessary visas are required.<br/>"
        "3. <b>SIMULATED RESERVATION NOTICE:</b> This electronic ticket is generated by the SkyFare demonstration platform. "
        "All flight references, seat numbers, and transactions are simulated for demonstration purposes."
    )
    elements.append(Paragraph(notice_text, disclaimer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
