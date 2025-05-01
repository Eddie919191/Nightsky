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
let burstTimer = 0;
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
    console.log('Canvas initialized:', windowWidth, windowHeight);
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
                    }
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
        stars = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Moment loaded:', doc.id, data.text, data.emotion);
            const emotion = emotions.includes(data.emotion) ? data.emotion : 'love';
            const initialPos = {
                x: centers.love.x * width + random(-50, 50),
                y: centers.love.y * height + random(-50, 50)
            };
            return {
                id: doc.id,
                text: data.text || '',
                emotion: emotion,
                originalEmotion: data.originalEmotion || emotion,
                brightness: data.brightness || 1,
                candles: data.candles || 0,
                read: data.read || false,
                pos: createVector(initialPos.x, initialPos.y),
                vel: p5.Vector.random2D().mult(0.1),
                target: createVector(centers[emotion].x * width, centers[emotion].y * height),
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

    // Fallback star
    if (stars.length === 0) {
        fill(255, 255, 0);
        noStroke();
        ellipse(width / 2, height / 2, 10, 10);
    }

    const loveCenter = { x: 0.5 * width, y: 0.5 * height };
    burstTimer = min(burstTimer + 1, 180);

    stars.forEach(star => {
        if (!star.pos || isNaN(star.pos.x) || isNaN(star.pos.y)) {
            star.pos = createVector(centers[star.emotion].x * width, centers[star.emotion].y * height);
            console.log('Fixed invalid position for star:', star.id);
        }
        star.pos.x = constrain(star.pos.x, 0, width);
        star.pos.y = constrain(star.pos.y, 0, height);

        let force = createVector(0, 0);
        const t = burstTimer;
        const forceMult = 0.0003 + (0.01 - 0.0003) * Math.exp(-3 * t / 180);
        const velLimit = 0.15 + (1 - 0.15) * Math.exp(-3 * t / 180);

        if (star.emotion === 'love') {
            force = p5.Vector.sub(star.target, star.pos).mult(forceMult * 2);
        } else {
            const distance = p5.Vector.dist(star.pos, createVector(loveCenter.x, loveCenter.y));
            const orbitRadius = constrain(distance, 50, 200);
            star.angle += 0.0005;
            const targetX = loveCenter.x + orbitRadius * cos(star.angle);
            const targetY = loveCenter.y + orbitRadius * sin(star.angle);
            force = p5.Vector.sub(createVector(targetX, targetY), star.pos).mult(forceMult);
            const originalTarget = createVector(centers[star.originalEmotion].x * width, centers[star.originalEmotion].y * height);
            force.add(p5.Vector.sub(originalTarget, star.pos).mult(forceMult * 0.2));
        }

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
        star.vel.limit(velLimit);
        star.pos.add(star.vel);

        // Draw star with exponential growth
        const [r, g, b] = colors[star.emotion];
        const alpha = star.read ? 150 : 200;
        const pulse = star.candles > 0 ? 1 + 0.15 * sin(frameCount * 0.01 + star.angle) : 1;
        const length = 4 + 20 * (1 - Math.exp(-0.2 * star.candles)) * pulse;
        const thickness = 1 + 5 * (1 - Math.exp(-0.2 * star.candles)) * pulse;

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

        stroke(r, g, b, alpha + 55 * sin(frameCount * 0.02) * (star.brightness - 1));
        strokeWeight(thickness);
        line(star.pos.x - length / 2, star.pos.y - length / 2, star.pos.x + length / 2, star.pos.y + length / 2);
        line(star.pos.x - length / 2, star.pos.y + length / 2, star.pos.x + length / 2, star.pos.y - length / 2);
        noStroke();
    });
}

function mousePressed() {
    stars.forEach(star => {
        const size = 4 + 20 * (1 - Math.exp(-0.2 * star.candles));
        if (dist(mouseX, mouseY, star.pos.x, star.pos.y) < size / 2) {
            db.collection('sharedMoments').doc(star.id).update({ read: true });
            showCandleModal(star, false);
        }
    });
}

function showCandleModal(star, openCandleInterface = false) {
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
                ${openCandleInterface ? `
                    <select id="candle-emotion">
                        <option value="love" selected>Love</option>
                        <option value="grief">Grief</option>
                        <option value="wonder">Wonder</option>
                        <option value="hope">Hope</option>
                        <option value="anger">Anger</option>
                        <option value="trust">Trust</option>
                    </select>
                    <textarea id="candle-message" placeholder="Your message (optional)..."></textarea>
                    <div class="modal-buttons">
                        <button class="candle-btn" onclick="saveCandle('${star.id}')"><span>🔥</span></button>
                        <button class="close-btn" onclick="document.querySelector('.modal').remove()">Cancel</button>
                    </div>
                ` : `
                    <div class="modal-buttons">
                        <button class="close-btn" onclick="document.querySelector('.modal').remove()">Close</button>
                        <button class="open-candle-btn" onclick="document.querySelector('.modal').remove(); showCandleModal(stars.find(s => s.id === '${star.id}'), true);"><span>🔥</span></button>
                    </div>
                `}
            </div>
        `;
        document.body.appendChild(modal);
    }).catch(error => {
        console.error('Error loading candles:', error);
        modal.innerHTML = `
            <div class="modal-content">
                <p style="color: rgb(${r}, ${g}, ${b})">${star.text}</p>
                <p>Error loading candles</p>
                <div class="modal-buttons">
                    <button class="close-btn" onclick="document.querySelector('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

async function saveCandle(momentId) {
    console.log('Attempting to save candle for moment:', momentId);
    const message = document.getElementById('candle-emotion')?.value;
    const candleEmotion = document.getElementById('candle-emotion').value;
    try {
        await db.collection('sharedMoments').doc(momentId).collection('candles').add({
            message,
            emotion: candleEmotion,
            timestamp: new Date().toISOString(),
            userId: firebase.auth().currentUser.uid
        });
        await db.collection('sharedMoments').doc(momentId).update({
            candles: firebase.firestore.FieldValue.increment(1),
            brightness: firebase.firestore.FieldValue.increment(0.1)
        });
        const snapshot = await db.collection('sharedMoments').doc(momentId).collection('candles').get();
        const candleCounts = { grief: 0, love: 0, wonder: 0, hope: 0, anger: 0, trust: 0 };
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.emotion) candleCounts[data.emotion]++;
        });
        const currentEmotion = (await db.collection('sharedMoments').doc(momentId).get()).data().emotion;
        const maxCount = Math.max(...Object.values(candleCounts));
        const dominantEmotion = Object.keys(candleCounts).find(key => candleCounts[key] === maxCount);
        if ((maxCount >= 10 || maxCount >= candleCounts[currentEmotion] + 5) && dominantEmotion !== currentEmotion) {
            await db.collection('sharedMoments').doc(momentId).update({
                emotion: dominantEmotion,
                originalEmotion: currentEmotion
            });
        }
        console.log('Candle saved successfully');
        document.querySelector('.modal').remove();
        const star = stars.find(s => s.id === momentId);
        if (star) {
            star.candles += 1;
            star.brightness += 0.1;
        }
    } catch (error) {
        console.error('Error saving candle:', error);
        alert('Error saving candle: ' + error.message);
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
