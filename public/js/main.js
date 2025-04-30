document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            window.location.href = '/public/login.html';
        }
    });

    // Smooth portal transitions
    document.querySelectorAll('.portal a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.body.style.opacity = '0';
            setTimeout(() => {
                window.location.href = link.href;
            }, 500);
        });
    });

    // Fade in portals
    document.querySelector('.portals').style.opacity = '1';
});
