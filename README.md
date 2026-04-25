# Limo Service Site

A full-stack luxury transportation booking system built with Go (Chi framework) and a vanilla HTML/CSS/JavaScript frontend. The system supports real-time booking, Stripe payments, admin controls, and automated booking expiration.

---

## Features

### Customer Booking System
- Interactive calendar-based booking interface (FullCalendar)
- Select pickup, dropoff, time, and duration
- Real-time availability checking
- Hourly pricing system
- Booking holds to prevent double-booking during checkout

---

### Stripe Payment Integration
- Stripe Checkout Session support
- Secure server-side payment creation
- Webhook-based payment confirmation
- Automatic booking confirmation after successful payment
- Cancelled or abandoned payments handled via expiry system

---

### Availability and Scheduling
- Prevents overlapping bookings
- Enforces 30-minute minimum intervals
- 1-hour buffer rule for booking time slots
- Admin-controlled blocked time slots
- Real-time conflict validation using PostgreSQL range queries

---

### Admin Dashboard
- JWT-authenticated admin routes
- View booking details
- Block and unblock time slots
- Update hourly pricing dynamically
- Monitor system status

---

### Background Expiry System
- Automated worker runs every minute
- Expired hold bookings are cleaned up
- Prevents abandoned checkout sessions from blocking time slots

---

## Tech Stack

### Backend
- Go (Golang)
- Chi Router
- PostgreSQL
- Stripe API
- JWT Authentication
- Godotenv

### Frontend
- HTML5 / CSS3
- Vanilla JavaScript
- FullCalendar.js
- Stripe Checkout

---

### Set Up Tables
```
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    pickup TEXT NOT NULL,
    dropoff TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    type TEXT NOT NULL DEFAULT 'booking',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_overlap
    EXCLUDE USING gist (
        tstzrange(start_time, end_time) WITH &&
    )
    WHERE (status IN ('reserved', 'paid'))
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Set Up Environment Variables

Create a .env file in the backend root:
```
DB_URL=your_postgres_connection
JWT_SECRET=your_JWT_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
ADMIN_USER=admin
ADMIN_PW=password
```

### Running the project
Run:  
`stripe listen --forward-to localhost:3000/api/stripe/webhook`  
This is also where to obtain your STRIPE_WEBHOOK_SECRET

In backend root:  
`go run main.go`  

Server runs on http://localhost:3000  
Open public page directly on http://localhost:5501/frontend/index.html  
Open admin page directly on http://localhost:5501/frontend/admin.html  

### Booking Flow
1. User selects a time slot through clicking and dragging on calendar or through text input
2. System checks availability (including buffer rules)
3. Booking is created with status:
4. hold (temporary reservation)
5. Stripe Checkout session is created
6. Payment completes → webhook confirms booking
7. Booking becomes paid

### Key Design Decisions
- Hold → Pay → Confirm booking lifecycle
- PostgreSQL tstzrange used for overlap detection
- Background worker handles cleanup instead of real-time cancellation
- Separation of admin and public booking logic

