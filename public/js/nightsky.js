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
            // Start near Love center for smoother orbiting
            const initialPos = {
                x: centers.love.x * width + random(-50, 50),
                y: centers.love.y * height + random(-50, 50)
            };
            return {
                id: doc.id,
                text: data.text,
                emotion: data.emotion,
                brightness: data.brightness,
                candles: data.candles,
                pos: createVector(initialPos.x, initialPos.y),
                vel: p5.Vector.random2D().mult(0.1),
                target: createVector(centers[data.emotion].x * width, centers[data.emotion].y * height),
                angle: random(TWO_PI) // Random initial angle for orbiting
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
    const loveCenter = { x: 0.2 * width, y: 0.2 * height };

    stars.forEach(star => {
        let force = createVector(0, 0);
        if (star.emotion === 'love') {
            // Love stars stay fixed at center
            force = p5.Vector.sub(star.target, star.pos).mult(0.002);
        } else {
            // Non-love stars orbit love center
            const distance = p5.Vector.dist(star.pos, createVector(loveCenter.x, loveCenter.y));
            const orbitRadius = constrain(distance, 50, 200);
            star.angle += 0.002; // Slow rotation
            const targetX = loveCenter.x + orbitRadius * cos(star.angle);
            const targetY = loveCenter.y + orbitRadius * sin(star.angle);
            force = p5.Vector.sub(createVector(targetX, targetY), star.pos).mult(0.0005);
        }

        // Attraction to same-emotion stars
        stars.forEach(other => {
            if (other !== star && other.emotion === star.emotion) {
                let d = p5.Vector.dist(star.pos, other.pos);
                if (d < 100 && d > 0) {
                    let attract = p5.Vector.sub(other.pos, star.pos).mult(0.0002 / d);
                    force.add(attract);
                }
            }
        });

        // Repulsion from different-emotion stars
        stars.forEach(other => {
            if (other !== star && other.emotion !== star.emotion) {
                let d = p5.Vector.dist(star.pos, other.pos);
                if (d < 80 && d > 0) {
                    let repel = p5.Vector.sub(star.pos, other.pos).mult(0.02 / d);
                    force.add(repel);
                }
            }
        });

        star.vel.add(force);
        star.vel.mult(0.9);
        star.vel.limit(0.3);
        star.pos.add(star.vel);

        // Draw star
        const [r, g, b] = colors[star.emotion];
        fill(r, g, b, 200 + 55 * sin(frameCount * 0.02) * (star.brightness - 1));
        noStroke();
        const size = 12 + star.brightness * 4;
        ellipse(star.pos.x, star.pos.y, size, size);
    });
}

function mousePressed() {
    stars.forEach(star => {
        const size = 12 + star.brightness * 4;
        if (dist(mouseX, mouseY, star.pos.x, star.pos.y) < size / 2) {
            showCandleModal(star);
        }
    });
}

function showCandleModal(star) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Light a Candle</h2>
            <p>Moment: ${star.text}</p>
            <p>Emotion: ${star.emotion}</p>
            <p>Candles: ${star.candles}</p>
            <textarea id="candle-message" placeholder="Your message..."></textarea>
            <button onclick="saveCandle('${star.id}')">Light Candle</button>
            <button onclick="this.closest('.modal').remove()">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);
}

async function saveCandle(momentId) {
    const message = document.getElementById('candle-message').value.trim();
    if (!message) {
        alert('Please enter a candle message.');
        return;
    }
    try {
        console.log('Saving candle for moment:', momentId);
        await db.collection('sharedMoments').doc(momentId).collection('candles').add({
            message,
            timestamp: new Date().toISOString(),
            userId: firebase.auth().currentUser.uid
        });
        await db.collection('sharedMoments').doc(momentId).update({
            candles: firebase.firestore.FieldValue.increment(1),
            brightness: firebase.firestore.FieldValue.increment(0.1)
        });
        console.log('Candle saved');
        document.querySelector('.modal').remove();
        loadStars();
    } catch (error) {
        console.error('Error saving candle:', error);
        alert('Error saving candle.');
    }
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
