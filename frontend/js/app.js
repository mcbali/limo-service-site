// FULLCALENDAR (PUBLIC UI)
let selectedSelection = null;
let selectedEvent = null;

// HELPERS
function toLocalDatetimeValue(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function getDurationMs() {
  const h = parseInt(document.getElementById("duration_hours")?.value || 0);
  const m = parseInt(document.getElementById("duration_minutes")?.value || 0);
  return (h * 60 + m) * 60 * 1000;
}

// CALENDAR INIT
document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    selectable: true,
    selectMirror: true,
    allDaySlot: false,
    slotMinTime: "08:00:00",
    slotMaxTime: "24:00:00",

    timeZone: "UTC",

    eventOverlap: false,

    eventTimeFormat: {
      hour: "numeric",
      minute: "2-digit",
      meridiem: "short",
    },

    selectConstraint: {
      startTime: "08:00:00",
      endTime: "24:00:00",
    },

    // LOAD BOOKINGS
    events: async function (_, successCallback) {
      try {
        const res = await fetch("http://localhost:3000/api/bookings");

        if (!res.ok) {
          successCallback([]);
          return;
        }

        const bookings = await res.json();

        const events = bookings
          .filter(b => {
            if (b.status === "expired") return false;

            if (
              b.status === "hold" &&
              b.expires_at &&
              new Date(b.expires_at) < new Date()
            ) return false;

            return true;
          })
          .map((b) => {
            return {
              id: b.id,
              start: new Date(b.start_time),
              end: new Date(b.end_time),

              title:
                b.status === "paid"
                  ? "Booked"
                  : b.status === "hold"
                  ? "Hold"
                  : "Blocked",

              color:
                b.status === "paid"
                  ? "#c59b2e"
                  : "#ef4444",

              editable: false,
              overlap: false,

              extendedProps: {
                status: b.status,
                expires_at: b.expires_at,
              },
            };
          });

        successCallback(events);
      } catch (err) {
        console.error(err);
        successCallback([]);
      }
    },

    // SELECT VALIDATION
    selectAllow: function (info) {
      const startHour = info.start.getUTCHours();
      const endHour = info.end.getUTCHours();

      if (startHour < 8 || endHour > 24) return false;

      const events = calendar.getEvents();

      for (let e of events) {
        const status = e.extendedProps?.status;

        const isBlocked = status === "blocked";
        const isPaid = status === "paid";
        const isActiveHold =
          status === "hold" &&
          (!e.extendedProps?.expires_at ||
            new Date(e.extendedProps.expires_at) > new Date());

        if (!(isBlocked || isPaid || isActiveHold)) continue;

        const overlap =
          info.start < e.end && info.end > e.start;

        if (overlap) return false;
      }

      return true;
    },

    // SELECT SLOT
    select: function (info) {
      if (info.end <= info.start) return;

      if (selectedEvent) {
        selectedEvent.remove();
        selectedEvent = null;
      }

      selectedSelection = info;

      document.getElementById("start_time").value =
        toLocalDatetimeValue(info.start);

      document.getElementById("end_time").value =
        info.end.toISOString();

      const minutes = (info.end - info.start) / 60000;

      document.getElementById("duration_hours").value =
        Math.floor(minutes / 60);

      document.getElementById("duration_minutes").value =
        minutes % 60;

      selectedEvent = calendar.addEvent({
        id: "selected",
        start: info.start,
        end: info.end,
        backgroundColor: "#ffcf40",
        borderColor: "#ffcf40",
        textColor: "black",
      });
    },

    eventClick: function (info) {
      const status = info.event.extendedProps?.status;

      if (status === "paid") alert("Already booked");
      if (status === "hold") alert("This slot is temporarily held");
    },
  });

  calendar.render();

  // TEXT INPUT AND CALENDAR SYNC
  function updateFromInputs() {
    const startVal = document.getElementById("start_time")?.value;
    if (!startVal) return;

    const start = new Date(startVal);
    const durationMs = getDurationMs();
    if (durationMs <= 0) return;

    const end = new Date(start.getTime() + durationMs);

    const startHour = start.getUTCHours();
    const endHour = end.getUTCHours();

    if (startHour < 8 || endHour > 24) {
      alert("Bookings must be between 8AM and 12AM");
      return;
    }

    const events = calendar.getEvents();

    for (let e of events) {
      if (e.id === "selected") continue;

      const status = e.extendedProps?.status;

      const activeHold =
        status === "hold" &&
        (!e.extendedProps?.expires_at ||
          new Date(e.extendedProps.expires_at) > new Date());

      const paid = status === "paid";

      if ((paid || activeHold) && start < e.end && end > e.start) {
        alert("Time overlaps with existing booking");
        return;
      }
    }

    if (selectedEvent) {
      selectedEvent.remove();
    }

    selectedSelection = { start, end };

    document.getElementById("end_time").value = end.toISOString();

    selectedEvent = calendar.addEvent({
      id: "selected",
      start,
      end,
      backgroundColor: "#ffcf40",
      borderColor: "#ffcf40",
      textColor: "black",
    });
  }

  ["start_time", "duration_hours", "duration_minutes"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("change", () => {
      updateFromInputs();

      const startVal = document.getElementById("start_time")?.value;
      if (startVal) calendar.gotoDate(new Date(startVal));
    });
  });

  // ==========================
  // PAYMENT FLOW
  // ==========================
  document.getElementById("continue-payment")?.addEventListener("click", async (e) => {
    e.preventDefault();

    const start = document.getElementById("start_time")?.value;
    const end = document.getElementById("end_time")?.value;

    if (!start || !end) return alert("Select time");

    const startDate = new Date(start);
    const endDate = new Date(end);

    const startHour = startDate.getUTCHours();
    const endHour = endDate.getUTCHours();

    if (startHour < 8 || endHour >= 24) {
      return alert("Invalid time range");
    }

    const payload = {
      name: document.querySelector("[name=name]")?.value,
      email: document.querySelector("[name=email]")?.value,
      pickup: document.querySelector("[name=pickup]")?.value,
      dropoff: document.querySelector("[name=dropoff]")?.value,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
    };

    try {
      const res = await fetch("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) return alert(await res.text());

      const booking = await res.json();

      const payRes = await fetch(
        "http://localhost:3000/api/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: booking.id }),
        }
      );

      const data = await payRes.json();
      window.location.href = data.url;

    } catch (err) {
      console.error(err);
      alert("Error");
    }
  });
});

// ==========================
// RATE DISPLAY
// ==========================
async function loadRate() {
  const res = await fetch("http://localhost:3000/api/rate");
  const data = await res.json();

  const rateEl = document.getElementById("hourly-rate");
  if (rateEl) {
    rateEl.textContent = `$${data.hourly_rate}/hr`;
  }
}

document.addEventListener("DOMContentLoaded", loadRate);