const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");
const signupForm = document.getElementById("signup-form");
const signinForm = document.getElementById("signin-form");

if (window.location.search.includes("mode=signup")) {
  container.classList.add("active");
}

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});

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
    alert(result.message || "Sign in completed");
    if (result.success) {
      if (result.user) {
        localStorage.setItem("cognifyUser", JSON.stringify(result.user));
      }
      window.location.href = "/dashboard";
    }
  } catch (error) {
    alert("Sign in failed. Please try again.");
    console.error(error);
  }
});
