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
let burstTimer = 0; // Tracks burst-in duration
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
    console.log('Canvas initialized:', windowWidth, windowHeight, 'p5.js version:', p5.prototype.VERSION);
    // Store session timestamp
    localStorage.setItem('lastSession', new Date().toISOString());
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = '/public/login.html';
            return;
        }
        console.log('Authenticated user:', user.uid);
        loadStars();
        db.collection('sharedMoments').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    const data = change.doc.data();
                    const star = stars.find(s => s.id === change.doc.id);
                    if (star) {
                        star.candles = data.candles || 0;
                        star.brightness = data.brightness || 1;
                        star.emotion = data.emotion || star.emotion;
                        star.target = createVector(centers[star.emotion].x * width, centers[star.emotion].y * height);
                        if (data.posX && data.posY && !isNaN(data.posX) && !isNaN(data.posY)) {
                            star.pos.set(data.posX * width, data.posY * height);
                        }
                    }
                } else if (change.type === 'added') {
                    const data = change.doc.data();
                    const angle = random(TWO_PI);
                    const spawnDistance = max(width, height);
                    const initialPos = {
                        x: width / 2 + cos(angle) * spawnDistance,
                        y: height / 2 + sin(angle) * spawnDistance
                    };
                    const star = {
                        id: change.doc.id,
                        text: data.text,
                        emotion: data.emotion,
                        originalEmotion: data.originalEmotion || data.emotion,
                        brightness: data.brightness || 1,
                        candles: data.candles || 0,
                        read: data.read || false,
                        pos: createVector(initialPos.x, initialPos.y),
                        vel: p5.Vector.random2D().mult(0.05),
                        target: createVector(centers[data.emotion].x * width, centers[data.emotion].y * height),
                        angle: random(TWO_PI),
                        isNew: true
                    };
                    stars.push(star);
                    console.log('New star added:', star.id, star.emotion, star.pos.x, star.pos.y);
                }
            });
        });
    });
}

async function loadStars() {
    try {
        console.log('Loading shared moments from Firestore');
        const snapshot = await db.collection('sharedMoments').get();
        console.log('Firestore snapshot size:', snapshot.size, 'Empty:', snapshot.empty);
        const lastSession = new Date(localStorage.getItem('lastSession') || 0);
        stars = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Moment loaded:', doc.id, data.text, data.emotion);
            const isNew = data.timestamp && new Date(data.timestamp) > lastSession;
            let initialPos = { x: width / 2, y: height / 2 }; // Start at center for burst-in
            if (isNew && data.posX && data.posY && !isNaN(data.posX) && !isNaN(data.posY) && data.posX >= 0 && data.posY <= 1) {
                initialPos = { x: data.posX * width, y: data.posY * height };
            } else if (isNew) {
                const angle = random(TWO_PI);
                const spawnDistance = max(width, height);
                initialPos = {
                    x: width / 2 + cos(angle) * spawnDistance,
                    y: height / 2 + sin(angle) * spawnDistance
                };
            }
            console.log('Star position:', doc.id, initialPos.x, initialPos.y, 'isNew:', isNew);
            return {
                id: doc.id,
                text: data.text,
                emotion: data.emotion,
                originalEmotion: data.originalEmotion || data.emotion,
                brightness: data.brightness || 1,
                candles: data.candles || 0,
                read: data.read || false,
                pos: createVector(initialPos.x, initialPos.y),
                vel: p5.Vector.random2D().mult(0.05),
                target: createVector(centers[data.emotion].x * width, centers[data.emotion].y * height),
                angle: random(TWO_PI),
                isNew: isNew
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

    // Fallback star
    if (stars.length === 0) {
        fill(255, 255, 0);
        noStroke();
        ellipse(width / 2, height / 2, 10, 10);
    }

    const loveCenter = { x: 0.5 * width, y: 0.5 * height };
    burstTimer = min(burstTimer + 1, 180); // ~3 seconds at 60 FPS

    stars.forEach(star => {
        // Validate position
        if (!star.pos || isNaN(star.pos.x) || isNaN(star.pos.y) || star.pos.x === null || star.pos.y === null) {
            star.pos = createVector(centers[star.emotion].x * width, centers[star.emotion].y * height);
            console.log('Fixed invalid position for star:', star.id, star.pos.x, star.pos.y);
        }
        // Clamp to canvas
        star.pos.x = constrain(star.pos.x, 0, width);
        star.pos.y = constrain(star.pos.y, 0, height);

        let force = createVector(0, 0);
        if (burstTimer < 180 && !star.isNew) {
            // Burst-in: strong force to emotion center
            force = p5.Vector.sub(star.target, star.pos).mult(0.01);
        } else if (star.isNew) {
            // Drift-in for new stars
            force = p5.Vector.sub(star.target, star.pos).mult(0.0005);
            if (p5.Vector.dist(star.pos, star.target) < 50) {
                star.isNew = false;
            }
        } else if (star.emotion === 'love') {
            force = p5.Vector.sub(star.target, star.pos).mult(0.001);
        } else {
            const distance = p5.Vector.dist(star.pos, createVector(loveCenter.x, loveCenter.y));
            const orbitRadius = constrain(distance, 50, 200);
            star.angle += 0.0005;
            const targetX = loveCenter.x + orbitRadius * cos(star.angle);
            const targetY = loveCenter.y + orbitRadius * sin(star.angle);
            force = p5.Vector.sub(createVector(targetX, targetY), star.pos).mult(0.0003);
            const originalTarget = createVector(centers[star.originalEmotion].x * width, centers[star.originalEmotion].y * height);
            force.add(p5.Vector.sub(originalTarget, star.pos).mult(0.00005));
        }

        // Attraction and repulsion for same-emotion stars
        stars.forEach(other => {
            if (other !== star && other.emotion === star.emotion) {
                let d = p5.Vector.dist(star.pos, other.pos);
                if (d < 30 && d > 0) {
                    let repel = p5.Vector.sub(star.pos, other.pos).mult(0.015 / d);
                    force.add(repel);
                } else if (d < 100 && d > 0) {
                    let attract = p5.Vector.sub(other.pos, star.pos).mult(0.0001 / d);
                    force.add(attract);
                }
            }
        });

        // Repulsion from different-emotion stars
        stars.forEach(other => {
            if (other !== star && other.emotion !== star.emotion) {
                let d = p5.Vector.dist(star.pos, other.pos);
                if (d < 80 && d > 0) {
                    let repel = p5.Vector.sub(star.pos, other.pos).mult(0.01 / d);
                    force.add(repel);
                }
            }
        });

        star.vel.add(force);
        star.vel.mult(0.95);
        star.vel.limit(burstTimer < 180 && !star.isNew ? 1 : 0.15); // Faster during burst
        star.pos.add(star.vel);

        // Save position periodically
        if (frameCount % 60 === 0) {
            db.collection('sharedMoments').doc(star.id).update({
                posX: star.pos.x / width,
                posY: star.pos.y / height
            }).catch(error => console.error('Error saving position:', error));
        }

        // Throttled debug log
        if (frameCount % 60 === 0) {
            console.log('Drawing star:', star.id, star.emotion, star.pos.x, star.pos.y);
        }

        // Draw star
        const [r, g, b] = colors[star.emotion];
        const alpha = star.read ? 150 : 200;
        const pulse = star.candles > 0 ? 1 + 0.15 * sin(frameCount * 0.01 + star.angle) : 1;
        const length = star.candles > 0 ? (8 + star.candles * 2) * pulse : 4;
        const thickness = star.candles > 0 ? (2 + star.candles * 0.5) * pulse : 1;

        // Yellow glow for read/unread
        if (!star.read) {
            fill(255, 255, 0, 20);
            noStroke();
            ellipse(star.pos.x, star.pos.y, length * 4, length * 4);
            fill(255, 255, 0, 50);
            ellipse(star.pos.x, star.pos.y, length * 3, length * 3);
            stroke(255, 255, 0, 100);
            strokeWeight(0.5);
            line(star.pos.x - length / 2, star.pos.y - length / 2, star.pos.x + length / 2, star.pos.y + length / 2);
            line(star.pos.x - length / 2, star.pos.y + length / 2, star.pos.x + length / 2, star.pos.y - length / 2);
        } else {
            fill(255, 255, 0, 10);
            noStroke();
            ellipse(star.pos.x, star.pos.y, length * 3, length * 3);
            stroke(255, 255, 0, 40);
            strokeWeight(0.5);
            line(star.pos.x - length / 2, star.pos.y - length / 2, star.pos.x + length / 2, star.pos.y + length / 2);
            line(star.pos.x - length / 2, star.pos.y + length / 2, star.pos.x + length / 2, star.pos.y - length / 2);
        }

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
    const [r, g, b] = colors[star.emotion];
    db.collection('sharedMoments').doc(star.id).collection('candles').get().then(snapshot => {
        const candleCounts = { grief: 0, love: 0, wonder: 0, hope: 0, anger: 0, trust: 0 };
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.emotion) candleCounts[data.emotion]++;
        });
        const candleDisplay = Object.entries(candleCounts)
            .filter(([_, count]) => count > 0)
            .map(([emotion, count]) => {
                const [cr, cg, cb] = colors[emotion];
                return `<span style="color: rgb(${cr}, ${cg}, ${cb})">🕯️ ${count}</span>`;
            })
            .join(' ');
        modal.innerHTML = `
            <div class="modal-content">
                <p style="color: rgb(${r}, ${g}, ${b})">${star.text}</p>
                <p>${candleDisplay || 'No candles yet'}</p>
                <select id="candle-emotion">
                    <option value="grief">Grief</option>
                    <option value="love">Love</option>
                    <option value="wonder">Wonder</option>
                    <option value="hope">Hope</option>
                    <option value="anger">Anger</option>
                    <option value="trust">Trust</option>
                </select>
                <textarea id="candle-message" placeholder="Your message..."></textarea>
                <button onclick="saveCandle('${star.id}')">Light Candle</button>
                <button onclick="this.closest('.modal').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

async function saveCandle(momentId) {
    const message = document.getElementById('candle-message').value.trim();
    const candleEmotion = document.getElementById('candle-emotion').value;
    if (!message) {
        alert('Please enter a candle message.');
        return;
    }
    try {
        console.log('Saving candle for moment:', momentId);
        await db.collection('sharedMoments').doc(momentId).collection('candles').add({
            message,
            emotion: candleEmotion,
            timestamp: new Date().toISOString(),
            userId: firebase.auth().currentUser.uid
        });
        await db.collection('sharedMoments').doc(momentId).update({
            candles: firebase.firestore.FieldValue.increment(1),
            brightness: firebase.firestore.FieldValue.increment(0.1),
            timestamp: new Date().toISOString() // Update timestamp
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
