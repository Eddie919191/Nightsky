// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC2TvTe6Y-WLrKKeikJ111EeHe2ZdGvK2I",
    authDomain: "reflections-92fbc.firebaseapp.com",
    projectId: "reflections-92fbc",
    storageBucket: "reflections-92fbc.firebasestorage.app",
    messagingSenderId: "485903066751",
    appId: "1:485903066751:web:73e26cbacdb2154a4b014a"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization failed:', error);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page loaded');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const remember = document.getElementById('remember');

    // Username validation: alphanumeric, 3-20 characters
    const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;

    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        console.log('Login attempt:', username);

        if (!usernameRegex.test(username)) {
            alert('Username must be 3-20 alphanumeric characters.');
            console.log('Invalid username:', username);
            return;
        }

        const email = `${username}@edensgate.com`;

        // Set persistence based on "remember me"
        const persistence = remember.checked
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        firebase.auth().setPersistence(persistence)
            .then(() => {
                console.log('Persistence set:', persistence);
                return firebase.auth().signInWithEmailAndPassword(email, password);
            })
            .then(() => {
                console.log('Login successful, redirecting to index');
                window.location.href = '/public/index.html';
            })
            .catch(error => {
                console.error('Login failed:', error);
                alert('Login failed: ' + error.message);
            });
    });

    registerBtn.addEventListener('click', () => {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        console.log('Register attempt:', username);

        if (!usernameRegex.test(username)) {
            alert('Username must be 3-20 alphanumeric characters.');
            console.log('Invalid username:', username);
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters.');
            console.log('Invalid password length:', password.length);
            return;
        }

        const email = `${username}@edensgate.com`;

        const persistence = remember.checked
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        firebase.auth().setPersistence(persistence)
            .then(() => {
                console.log('Persistence set for registration:', persistence);
                return firebase.auth().createUserWithEmailAndPassword(email, password);
            })
            .then(() => {
                console.log('Registration successful, redirecting to index');
                window.location.href = '/public/index.html';
            })
            .catch(error => {
                console.error('Registration failed:', error);
                if (error.code === 'auth/email-already-in-use') {
                    alert('Username is already taken.');
                } else {
                    alert('Registration failed: ' + error.message);
                }
            });
    });
});
