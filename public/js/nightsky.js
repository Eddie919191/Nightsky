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

const db = firebase.firestore();

let stars = [];
const emotions = ['grief', 'love', 'wonder', 'hope', 'anger', 'trust'];
const colors = {
    grief: [30, 58, 95],   // Deep Blue #1E3A5F
    love: [255, 111, 97],   // Warm Rose #FF6F61
    wonder: [255, 215, 0],  // Celestial Gold #FFD700
    hope: [111, 207, 151],  // Soft Emerald #6FCF97
    anger: [192, 57, 43],   // Ember Red #C0392B
    trust: [174, 223, 247]  // Pale Sky #AEDFF7
};
const centers = {
    grief: { x: 0.2, y: 0.8 },
    love: { x: 0.2, y: 0.2 },
    wonder: { x: 0.8, y: 0.8 },
    hope: { x: 0.8, y: 0.2 },
    anger: { x: 0.5, y: 0.8 },
    trust: { x: 0.5, y: 0.5 }
};
const loveCenter = { x: 0.2 * windowWidth, y: 0.2 * windowHeight }; // Love center for orbiting

function setup() {
    createCanvas(windowWidth, windowHeight);
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = '/public/login.html';
            return;
        }
        console.log('Authenticated user:', user.uid);
        loadStars();
    });
}

async function loadStars() {
    try {
        console.log('Loading shared moments from Firestore');
        const snapshot = await db.collection('sharedMoments').get();
        console.log('Firestore snapshot size:', snapshot.size, 'Empty:', snapshot.empty);
        stars = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Moment loaded:', doc.id, data.text, data.emotion);
            return {
                id: doc.id,
                text: data.text,
                emotion: data.emotion,
                brightness: data.brightness,
                candles: data.candles,
                pos: createVector(data.position.x * width / 100, data.position.y * height / 100),
                vel: p5.Vector.random2D().mult(0.2), // Reduced initial velocity
                target: createVector(centers[data.emotion].x * width, centers[data.emotion].y * height),
                angle: 0 // For orbiting non-love stars
            };
        });
        console.log('Stars loaded:', stars.length);
    } catch (error) {
        console.error('Error loading stars:', error);
        stars = [];
    }
}

function draw() {
    background(10, 10, 35);
    loveCenter.x = 0.2 * width;
    loveCenter.y = 0.2 * height;

    stars.forEach(star => {
        let force;
        if (star.emotion === 'love') {
            // Love stars move to their center
            force = p5.Vector.sub(star.target, star.pos).mult(0.002); // Stronger attraction
        } else {
            // Non-love stars orbit love center counterclockwise
            const distance = p5.Vector.dist(star.pos, createVector(loveCenter.x, loveCenter.y));
            const orbitRadius = constrain(distance, 50, 200); // Keep orbit reasonable
            star.angle += 0.005; // Slow counterclockwise rotation
            const targetX = loveCenter.x + orbitRadius * cos(star.angle);
            const targetY = loveCenter.y + orbitRadius * sin(star.angle);
            force = p5.Vector.sub(createVector(targetX, targetY), star.pos).mult(0.001);
        }

        // Repulsion for bright stars
        if (star.brightness > 1) {
            stars.forEach(other => {
                if (other !== star) {
                    let d = p5.Vector.dist(star.pos, other.pos);
                    if (d < 50 && d > 0) {
                        let repel = p5.Vector.sub(star.pos, other.pos).mult(0.01 * star.brightness / d);
                        force.add(repel);
                    }
                }
            });
        }

        star.vel.add(force);
        star.vel.mult(0.95); // Damping for stability
        star.vel.limit(0.5); // Lower speed limit
        star.pos.add(star.vel);

        // Draw star
        const [r, g, b] = colors[star.emotion];
        fill(r, g, b, 200 + 55 * sin(frameCount * 0.02) * (star.brightness - 1));
        noStroke();
        const size = 8 + star.brightness * 3; // Larger stars
        ellipse(star.pos.x, star.pos.y, size, size);
    });
}

function mousePressed() {
    stars.forEach(star => {
        const size = 8 + star.brightness * 3;
        if (dist(mouseX, mouseY, star.pos.x, star.pos.y) < size / 2) {
            alert(`Moment: ${star.text}\nEmotion: ${star.emotion}\nCandles: ${star.candles}`);
        }
    });
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (stars.length > 0) {
        stars.forEach(star => {
            star.pos.set(star.pos.x * width / 100, star.pos.y * height / 100);
            star.target.set(centers[star.emotion].x * width, centers[star.emotion].y * height);
        });
    }
}
