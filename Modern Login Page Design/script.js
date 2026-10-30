const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");
const signupForm = document.getElementById("signup-form");
const signinForm = document.getElementById("signin-form");
const resetForm = document.getElementById("reset-form");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const backToSigninLink = document.getElementById("back-to-signin-link");
const signinEmailInput = document.getElementById("signin-email");
const resetEmailInput = document.getElementById("reset-email");
const resetPasswordInput = document.getElementById("reset-password");

// Check URL params for mode
if (window.location.search.includes("mode=signup")) {
  container.classList.add("active");
}

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
  // Reset back to sign-in form if user was on reset-password view
  if (resetForm && signinForm) {
    resetForm.classList.add("hidden-form");
    signinForm.classList.remove("hidden-form");
  }
});

// ==================== FORGOT & RESET PASSWORD ====================

if (forgotPasswordLink && resetForm && signinForm) {
  forgotPasswordLink.addEventListener("click", (event) => {
    event.preventDefault();
    if (signinEmailInput && signinEmailInput.value) {
      resetEmailInput.value = signinEmailInput.value;
    }
    signinForm.classList.add("hidden-form");
    resetForm.classList.remove("hidden-form");
    if (resetEmailInput.value) {
      resetPasswordInput.focus();
    } else {
      resetEmailInput.focus();
    }
  });
}

if (backToSigninLink && resetForm && signinForm) {
  backToSigninLink.addEventListener("click", (event) => {
    event.preventDefault();
    resetForm.classList.add("hidden-form");
    signinForm.classList.remove("hidden-form");
  });
}

async function postJSON(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
    const result = await postJSON("/api/signup", data);
    if (result.success) {
      if (result.user) {
        localStorage.setItem("cognifyUser", JSON.stringify(result.user));
      }
      alert(result.message || "Signup completed");
      window.location.href = "/dashboard";
    } else {
      alert(result.message || "Signup failed. Please try again.");
    }
  } catch (error) {
    alert("Signup failed. Please try again.");
    console.error(error);
  }
});

signinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(signinForm);
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
    const result = await postJSON("/api/signin", data);
    if (result.success) {
      if (result.user) {
        localStorage.setItem("cognifyUser", JSON.stringify(result.user));
      }
      alert(result.message || "Signed in successfully");
      window.location.href = "/dashboard";
    } else {
      alert(result.message || "Invalid credentials. Please try again.");
    }
  } catch (error) {
    alert("Sign in failed. Please try again.");
    console.error(error);
  }
});

if (resetForm) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = resetEmailInput.value.trim();
    const newPassword = resetPasswordInput.value;

    if (!email || !newPassword) {
      alert("Please enter both email and new password.");
      return;
    }

    if (newPassword.length < 4) {
      alert("Password must be at least 4 characters long.");
      return;
    }

    try {
      const result = await postJSON("/api/reset-password", { email, newPassword });
      if (result.success) {
        alert(result.message || "Password reset successfully! Please sign in with your new password.");
        resetForm.reset();
        resetForm.classList.add("hidden-form");
        signinForm.classList.remove("hidden-form");
        if (signinEmailInput) {
          signinEmailInput.value = email;
        }
        const signinPasswordInput = document.getElementById("signin-password");
        if (signinPasswordInput) {
          signinPasswordInput.value = "";
          signinPasswordInput.focus();
        }
      } else {
        alert(result.message || "Password reset failed. Please check your email and try again.");
      }
    } catch (error) {
      alert("Server error while resetting password. Please try again.");
      console.error(error);
    }
  });
}

// ==================== THEME TOGGLE (Dark / Light) ====================

function setupTheme() {
  const savedTheme = localStorage.getItem("cognify_theme") || "dark";
  applyTheme(savedTheme);

  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("cognify_theme", theme);
  const themeIcon = document.getElementById("themeIcon");
  const themeLabel = document.getElementById("themeLabel");
  if (themeIcon && themeLabel) {
    if (theme === "light") {
      themeIcon.className = "fas fa-sun";
      themeLabel.textContent = "Light";
    } else {
      themeIcon.className = "fas fa-moon";
      themeLabel.textContent = "Dark";
    }
  }
}

setupTheme();
