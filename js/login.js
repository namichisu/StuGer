// Login Logic

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Check if already logged in, redirect accordingly
  try {
    const session = sessionStorage.getItem('stuger_user') || sessionStorage.getItem('edupulse_user');
    if (session) {
      const user = JSON.parse(session);
      if (user.role === 'admin') {
        window.location.replace('admin.html');
        return;
      } else if (user.role === 'student') {
        window.location.replace('student.html');
        return;
      }
    }
  } catch (err) {
    sessionStorage.removeItem('stuger_user');
    sessionStorage.removeItem('edupulse_user');
  }

  const loginForm = document.getElementById('loginForm');
  const loginIdentifier = document.getElementById('loginIdentifier');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const btnSubmitLogin = document.getElementById('btnSubmitLogin');
  const btnDemoAdmin = document.getElementById('btnDemoAdmin');
  const btnDemoStudent = document.getElementById('btnDemoStudent');
  const toastContainer = document.getElementById('toastContainer');

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // Handle Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    btnSubmitLogin.disabled = true;
    btnSubmitLogin.textContent = 'Signing in...';

    const identifier = loginIdentifier.value.trim();
    const password = loginPassword.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const json = await res.json();

      if (json.success && json.user) {
        sessionStorage.setItem('stuger_user', JSON.stringify(json.user));
        showToast(`Signed in as ${json.user.username}`, 'success');

        setTimeout(() => {
          if (json.user.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'student.html';
          }
        }, 300);
      } else {
        loginError.textContent = json.message || 'Invalid username or password.';
        loginError.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Login error:', err);
      loginError.textContent = 'Network error connecting to authentication service.';
      loginError.classList.remove('hidden');
    } finally {
      btnSubmitLogin.disabled = false;
      btnSubmitLogin.textContent = 'Sign In';
    }
  });

  // Demo Credentials Fill
  btnDemoAdmin.addEventListener('click', () => {
    loginIdentifier.value = 'terobau';
    loginPassword.value = 'teriama@123';
    loginError.classList.add('hidden');
    loginPassword.focus();
  });

  btnDemoStudent.addEventListener('click', () => {
    loginIdentifier.value = 'STU001';
    loginPassword.value = 'student123';
    loginError.classList.add('hidden');
    loginPassword.focus();
  });
});

