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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let stars = [];
const emotions = ['sadness', 'joy', 'awe', 'peace', 'love', 'fear'];
const centers = {
    sadness: { x: 0.2, y: 0.8 },
    joy: { x: 0.8, y: 0.2 },
    awe: { x: 0.8, y: 0.8 },
    peace: { x: 0.5, y: 0.5 },
    love: { x: 0.2, y: 0.2 },
    fear: { x: 0.5, y: 0.8 }
};

function setup() {
    createCanvas(windowWidth, windowHeight);
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            window.location.href = '/public/login.html';
            return;
        }
        loadStars();
    });
}

async function loadStars() {
    try {
        const snapshot = await db.collection('sharedMoments').get();
        stars = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                text: data.text,
                emotion: data.emotion,
                brightness: data.brightness,
                candles: data.candles,
                pos: createVector(data.position.x * width / 100, data.position.y * height / 100),
                vel: p5.Vector.random2D().mult(0.5),
                target: createVector(centers[data.emotion].x * width, centers[data.emotion].y * height)
            };
        });
        console.log('Stars loaded:', stars.length);
    } catch (error) {
        console.error('Error loading stars:', error);
    }
}

function draw() {
    background(10, 10, 35);
    stars.forEach(star => {
        // Move toward emotional center
        let force = p5.Vector.sub(star.target, star.pos).mult(0.001);
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
        star.vel.limit(1);
        star.pos.add(star.vel);

        // Draw star
        fill(255, 255, 255, 200 + 55 * sin(frameCount * 0.02) * (star.brightness - 1));
        noStroke();
        ellipse(star.pos.x, star.pos.y, 5 + star.brightness * 2, 5 + star.brightness * 2);
    });
}

function mousePressed() {
    stars.forEach(star => {
        if (dist(mouseX, mouseY, star.pos.x, star.pos.y) < 5 + star.brightness * 2) {
            alert(`Moment: ${star.text}\nEmotion: ${star.emotion}\nCandles: ${star.candles}`);
        }
    });
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    stars.forEach(star => {
        star.pos.set(star.pos.x * width / 100, star.pos.y * height / 100);
        star.target.set(centers[star.emotion].x * width, centers[star.emotion].y * height);
    });
}
