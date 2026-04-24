document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const loginForm = document.getElementById("login-form");
  const calendarEl = document.getElementById("admin-calendar");
  const modal = document.getElementById("booking-modal");
  let calendar = null;

  if (token) {
    document.querySelector(".dashboard").classList.remove("hidden");
    loginForm.classList.add("hidden");
    initCalendar();
  }


  // LOGIN
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(e.target));

      try {
        const res = await fetch("http://localhost:3000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          alert("Login failed");
          return;
        }

        const result = await res.json();
        localStorage.setItem("token", result.token);

        alert("Login successful");

        // SHOW CALENDAR AFTER LOGIN
        document.querySelector(".dashboard").classList.remove("hidden");
        loginForm.classList.add("hidden");

        initCalendar(); 
      } catch (err) {
        console.error(err);
        alert("Login error");
      }
    });
  }

  function initCalendar() {
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "timeGridWeek",
      selectable: true,
      selectOverlap: false,
      allDaySlot: false,
      timeZone: "UTC",

      eventTimeFormat: {
        hour: "numeric",
        minute: "2-digit",
        meridiem: "short",
      },

      slotMinTime: "08:00:00",
      slotMaxTime: "24:00:00",

      // LOAD BOOKINGS
      events: async function (_, successCallback) {
        try {
          const res = await fetch("http://localhost:3000/api/admin/bookings", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          if (res.status === 401) {
            localStorage.removeItem("token");

            alert("Session expired. Please log in again.");

            document.querySelector(".dashboard").classList.add("hidden");
            loginForm.classList.remove("hidden");

            return;
          }

          const bookings = await res.json();
          const now = new Date();

          const events = bookings
            .filter((b) => {
              if (b.status === "hold" && b.expires_at) {
                return new Date(b.expires_at) > now;
              }
              return true;
            })
            .map((b) => ({
              id: b.id,
              start: new Date(b.start_time),
              end: new Date(b.end_time),

              title:
                b.status === "paid"
                  ? "Booked"
                  : b.status === "blocked"
                  ? "Blocked"
                  : "Hold",

              color:
                b.status === "paid"
                  ? "#c59b2e"
                  : b.status === "blocked"
                  ? "#ef4444"
                  : "#f59e0b",

              extendedProps: {
                name: b.name,
                email: b.email,
                pickup: b.pickup,
                dropoff: b.dropoff,
                status: b.status,
              },

              editable: false,
              overlap: false,
            }));

          successCallback(events);
        } catch (err) {
          console.error(err);
          successCallback([]);
        }
      },

      // BLOCK SLOT
      select: async function (info) {
        const ok = confirm(
          `Block this time slot?\n${info.start.toUTCString()} → ${info.end.toUTCString()}`
        );

        if (!ok) return;

        const res = await fetch("http://localhost:3000/api/admin/block", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            start_time: info.start.toISOString(),
            end_time: info.end.toISOString(),
          }),
        });

        if (!res.ok) {
          alert("Failed to block slot");
          return;
        }

        calendar.refetchEvents();
      },

      eventClick: function (info) {
        const e = info.event;
        const d = e.extendedProps;

        // unblock logic
        if (d.status === "blocked") {
            const ok = confirm("Unblock this slot?");
            if (!ok) return;

            fetch(`http://localhost:3000/api/admin/block/${e.id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            }).then(() => calendar.refetchEvents());

            return;
        }

        // popup details
        const nameEl = document.getElementById("modal-name");
        const emailEl = document.getElementById("modal-email");
        const pickupEl = document.getElementById("modal-pickup");
        const dropoffEl = document.getElementById("modal-dropoff");
        const timeEl = document.getElementById("modal-time");

        if (!nameEl || !emailEl || !pickupEl || !dropoffEl || !timeEl) {
            console.error("Modal elements missing");
            return;
        }

        nameEl.textContent = d.name || "-";
        emailEl.textContent = d.email || "-";
        pickupEl.textContent = d.pickup || "-";
        dropoffEl.textContent = d.dropoff || "-";

        timeEl.textContent =
            new Date(e.start).toUTCString() +
            " → " +
            new Date(e.end).toUTCString();

        window.selectedBookingId = e.id;

        const modal = document.getElementById("booking-modal");
        modal.classList.remove("hidden");
        },
    });

    calendar.render();
  }

  document.getElementById("close-modal").onclick = () => {
    modal.classList.add("hidden");
  };

  window.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  };

});

document.getElementById("update-rate").addEventListener("click", async () => {
  const rate = document.getElementById("rate-input").value;

  const res = await fetch("http://localhost:3000/api/admin/rate", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ rate }),
  });

  if (!res.ok) {
    alert("Failed to update rate");
    return;
  }

  alert("Rate updated successfully");
});