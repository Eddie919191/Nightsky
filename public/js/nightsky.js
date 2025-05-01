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
let fadeAlpha = 0;
const emotions = ['grief', 'love', 'wonder', 'hope', 'anger', 'trust'];
const colors = {
    grief: [44, 68, 104],
    love: [224, 108, 98],
    wonder: [224, 192, 20],
    hope: [108, 185, 140],
    anger: [173, 65, 54],
    trust: [159, 198, 217]
};
const centers = {
    grief: { x: 0.2, y: 0.8 },
    love: { x: 0.5, y: 0.5 },
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
            const initialPos = {
                x: centers.love.x * width + random(-50, 50),
                y: centers.love.y * height + random(-50, 50)
            };
            return {
                id: doc.id,
                text: data.text,
                emotion: data.emotion,
                brightness: data.brightness || 1,
                candles: data.candles || 0,
                read: data.read || false,
                pos: createVector(initialPos.x, initialPos.y),
                vel: p5.Vector.random2D().mult(0.1),
                target: createVector(centers[data.emotion].x * width, centers[data.emotion].y * height),
                angle: random(TWO_PI)
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

    // Starfield
    for (let i = 0; i < 50; i++) {
        fill(255, random(50, 100));
        noStroke();
        ellipse(random(width), random(height), 1, 1);
    }

    // Fade-in
    if (fadeAlpha < 255) {
        fadeAlpha += 2;
        fill(10, 10, 35, 255 - fadeAlpha);
        rect(0, 0, width, height);
    }

    const loveCenter = { x: 0.5 * width, y: 0.5 * height };

    stars.forEach(star => {
        let force = createVector(0, 0);
        if (star.emotion === 'love') {
            force = p5.Vector.sub(star.target, star.pos).mult(0.002);
        } else {
            const distance = p5.Vector.dist(star.pos, createVector(loveCenter.x, loveCenter.y));
            const orbitRadius = constrain(distance, 50, 200);
            star.angle += 0.001;
            const targetX = loveCenter.x + orbitRadius * cos(star.angle);
            const targetY = loveCenter.y + orbitRadius * sin(star.angle);
            force = p5.Vector.sub(createVector(targetX, targetY), star.pos).mult(0.0005);
        }

        // Attraction and slight repulsion for same-emotion stars
        stars.forEach(other => {
            if (other !== star && other.emotion === star.emotion) {
                let d = p5.Vector.dist(star.pos, other.pos);
                if (d < 20 && d > 0) {
                    // Repel if too close
                    let repel = p5.Vector.sub(star.pos, other.pos).mult(0.01 / d);
                    force.add(repel);
                } else if (d < 100 && d > 0) {
                    // Attract otherwise
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
        star.vel.limit(0.2);
        star.pos.add(star.vel);

        // Draw star
        const [r, g, b] = colors[star.emotion];
        const alpha = star.read ? 150 : 200;
        const pulse = star.candles > 0 ? 1 + 0.15 * sin(frameCount * 0.01 + star.angle) : 1;
        const length = star.candles > 0 ? (8 + star.candles * 2) * pulse : 4;
        const thickness = star.candles > 0 ? (2 + star.candles * 0.5) * pulse : 1;

        // Golden glow for read/unread
        const glowAlpha = star.read ? 40 : 80;
        fill(255, 215, 0, glowAlpha / 2); // Faint golden glow
        noStroke();
        ellipse(star.pos.x, star.pos.y, length * 2, length * 2);
        stroke(255, 215, 0, glowAlpha); // Golden outline
        strokeWeight(0.5); // Thin regardless of size
        line(star.pos.x - length / 2, star.pos.y - length / 2, star.pos.x + length / 2, star.pos.y + length / 2);
        line(star.pos.x - length / 2, star.pos.y + length / 2, star.pos.x + length / 2, star.pos.y - length / 2);

        // X-shaped star
        stroke(r, g, b, alpha + 55 * sin(frameCount * 0.02) * (star.brightness - 1));
        strokeWeight(thickness);
        line(star.pos.x - length / 2, star.pos.y - length / 2, star.pos.x + length / 2, star.pos.y + length / 2);
        line(star.pos.x - length / 2, star.pos.y + length / 2, star.pos.x + length / 2, star.pos.y - length / 2);
        noStroke();
    });
}

function mousePressed() {
    stars.forEach(star => {
        const size = star.candles > 0 ? 8 + star.candles * 2 : 4;
        if (dist(mouseX, mouseY, star.pos.x, star.pos.y) < size / 2) {
            db.collection('sharedMoments').doc(star.id).update({ read: true });
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
        const star = stars.find(s => s.id === momentId);
        if (star) {
            star.candles += 1;
            star.brightness += 0.1;
        }
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
