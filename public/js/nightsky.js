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
let initialSnapTimer = 0;
let chatboxTimer = 0; // New timer for chatbox
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

        // Add Portal Button (Top Center)
        const portalButton = document.createElement('button');
        portalButton.className = 'portal-btn';
        portalButton.innerText = 'Back to Portals';
        document.body.appendChild(portalButton);

        // Add User Icon (Bottom Center)
        const userIcon = document.createElement('button');
        userIcon.className = 'user-icon';
        userIcon.innerHTML = '<span>🧑</span>';
        document.body.appendChild(userIcon);
    });

    // Event delegation for dynamically created buttons
    document.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        if (target.classList.contains('candle-btn')) {
            console.log('Candle button clicked');
            const momentId = target.dataset.momentId;
            if (momentId) saveCandle(momentId);
        } else if (target.classList.contains('close-btn')) {
            console.log('Close/Cancel button clicked');
            const modal = target.closest('.modal');
            if (modal) modal.remove();
        } else if (target.classList.contains('open-candle-btn')) {
            console.log('Open candle interface button clicked');
            const momentId = target.dataset.momentId;
            if (momentId) {
                const star = stars.find(s => s.id === momentId);
                if (star) {
                    document.querySelector('.modal')?.remove();
                    showCandleModal(star, true);
                }
            }
        } else if (target.classList.contains('portal-btn')) {
            console.log('Portal button clicked, returning to main menu');
            window.location.href = '/public/index.html';
        } else if (target.classList.contains('user-icon')) {
            console.log('User icon clicked, opening user candles interface');
            showUserCandlesModal();
        }
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
    initialSnapTimer = min(initialSnapTimer + 1, 360);
    chatboxTimer += 1; // Increment chatbox timer

    // Check for chatbox after 30 seconds (1800 frames at 60 FPS)
    if (chatboxTimer === 1800 && !document.querySelector('.chatbox')) {
        showRandomChatbox();
    }

    stars.forEach(star => {
        if (!star.pos || isNaN(star.pos.x) || isNaN(star.pos.y)) {
            star.pos = createVector(centers[star.emotion].x * width, centers[star.emotion].y * height);
            console.log('Fixed invalid position for star:', star.id);
        }
        star.pos.x = constrain(star.pos.x, 0, width);
        star.pos.y = constrain(star.pos.y, 0, height);

        let force = createVector(0, 0);
        let forceMult, velLimit;

        if (initialSnapTimer < 120) {
            forceMult = 0.05;
            velLimit = 2;
        } else {
            const t = initialSnapTimer - 120;
            const decay = Math.exp(-5 * t / 360);
            forceMult = 0.0001 + (0.002 - 0.0001) * decay;
            velLimit = 0.05 + (0.2 - 0.05) * decay;
        }

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
        star.vel.mult(0.98);
        star.vel.limit(velLimit);
        star.pos.add(star.vel);

        // Draw Glow Blossom
        const [r, g, b] = colors[star.emotion];
        const alpha = star.read ? 150 : 200;
        const pulse = star.candles > 0 ? 1 + 0.15 * sin(frameCount * 0.01 + star.angle) : 1;
        const baseSize = 4 + 4 * (1 - Math.exp(-0.01 * star.candles)) * pulse;
        const haloSize = baseSize * (star.read ? 3 : 4);
        const tendrilLength = baseSize * 1.5;

        noStroke();
        fill(r, g, b, alpha * 0.2 + 20 * sin(frameCount * 0.02));
        ellipse(star.pos.x, star.pos.y, haloSize, haloSize);

        if (!star.read) {
            fill(255, 255, 0, 20);
            ellipse(star.pos.x, star.pos.y, haloSize * 1.5, haloSize * 1.5);
            fill(255, 255, 0, 10);
            ellipse(star.pos.x, star.pos.y, haloSize * 2, haloSize * 2);
        }

        fill(255, 255, 200, alpha);
        ellipse(star.pos.x, star.pos.y, baseSize * 0.5, baseSize * 0.5);

        stroke(r, g, b, alpha + 55 * sin(frameCount * 0.02) * (star.brightness - 1));
        strokeWeight(baseSize * 0.1);
        const numTendrils = 6;
        for (let i = 0; i < numTendrils; i++) {
            const angle = (TWO_PI / numTendrils) * i + frameCount * 0.005;
            const x1 = star.pos.x;
            const y1 = star.pos.y;
            const x2 = x1 + cos(angle) * tendrilLength;
            const y2 = y1 + sin(angle) * tendrilLength;
            const cx = x1 + cos(angle) * tendrilLength * 0.5;
            const cy = y1 + sin(angle) * tendrilLength * 0.5;
            noFill();
            beginShape();
            vertex(x1, y1);
            quadraticVertex(cx + random(-baseSize * 0.2, baseSize * 0.2), cy + random(-baseSize * 0.2, baseSize * 0.2), x2, y2);
            endShape();
        }

        noStroke();
    });
}

function showRandomChatbox() {
    // Find stars with changed emotions
    const eligibleStars = stars.filter(star => star.emotion !== star.originalEmotion);
    if (eligibleStars.length === 0) {
        console.log('No stars with changed emotions for chatbox');
        return;
    }

    // Pick a random star
    const star = eligibleStars[Math.floor(Math.random() * eligibleStars.length)];
    const [r, g, b] = colors[star.emotion];

    // Generate message
    const messages = [
        `From ${star.originalEmotion} to ${star.emotion}, this moment shines brighter through shared hearts!`,
        `This ${star.originalEmotion} moment transformed into ${star.emotion} with the warmth of many candles!`,
        `Community love turned this ${star.originalEmotion} into a beacon of ${star.emotion}!`,
        `Candles reshaped this ${star.originalEmotion} moment into one of ${star.emotion}!`
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];

    // Create chatbox
    const chatbox = document.createElement('div');
    chatbox.className = 'chatbox';
    chatbox.innerHTML = `<p style="color: rgb(${r}, ${g}, ${b})">${message}</p>`;
    
    // Position near star (adjust to avoid screen edges)
    const x = Math.min(Math.max(star.pos.x, 50), windowWidth - 150); // Keep within bounds
    const y = Math.min(Math.max(star.pos.y, 50), windowHeight - 100);
    chatbox.style.left = `${x}px`;
    chatbox.style.top = `${y}px`;

    document.body.appendChild(chatbox);

    // Remove after 5 seconds
    setTimeout(() => {
        chatbox.style.opacity = '0';
        setTimeout(() => chatbox.remove(), 500); // Wait for fade-out
    }, 5000);
}

function mousePressed() {
    stars.forEach(star => {
        const size = 4 + 4 * (1 - Math.exp(-0.01 * star.candles));
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
                        <button class="candle-btn" data-moment-id="${star.id}"><span>🔥</span></button>
                        <button class="close-btn">Cancel</button>
                    </div>
                ` : `
                    <div class="modal-buttons">
                        <button class="close-btn">Close</button>
                        <button class="open-candle-btn" data-moment-id="${star.id}"><span>🔥</span></button>
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
                    <button class="close-btn">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

async function showUserCandlesModal() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user authenticated for user candles modal');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal user-candles-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Your Candles & Messages</h2>
            <div class="candles-list" id="candles-list">
                <p>Loading...</p>
            </div>
            <div class="modal-buttons">
                <button class="close-btn">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    try {
        const momentsSnapshot = await db.collection('sharedMoments').get();
        const moments = momentsSnapshot.docs.map(doc => ({
            id: doc.id,
            text: doc.data().text,
            read: doc.data().read || false,
            emotion: doc.data().emotion || 'love'
        }));

        const userCandles = [];
        for (const moment of moments) {
            const candlesSnapshot = await db.collection('sharedMoments').doc(moment.id).collection('candles')
                .where('userId', '==', user.uid)
                .get();
            candlesSnapshot.forEach(doc => {
                const data = doc.data();
                userCandles.push({
                    momentId: moment.id,
                    momentText: moment.text,
                    momentRead: moment.read,
                    emotion: data.emotion,
                    message: data.message || '',
                    timestamp: data.timestamp
                });
            });
        }

        userCandles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const candlesList = document.getElementById('candles-list');
        if (userCandles.length === 0) {
            candlesList.innerHTML = '<p>No candles or messages yet.</p>';
        } else {
            candlesList.innerHTML = userCandles.map(candle => {
                const [r, g, b] = colors[candle.emotion];
                const unreadIndicator = !candle.momentRead ? '<span class="unread-indicator">✨ Unread</span>' : '';
                return `
                    <div class="candle-item ${!candle.momentRead ? 'unread' : ''}">
                        <p><strong style="color: rgb(${r}, ${g}, ${b})">${candle.emotion}</strong> on "${candle.momentText.substring(0, 50)}${candle.momentText.length > 50 ? '...' : ''}"</p>
                        ${candle.message ? `<p>Message: ${candle.message}</p>` : ''}
                        ${unreadIndicator}
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading user candles:', error);
        document.getElementById('candles-list').innerHTML = '<p>Error loading your candles.</p>';
    }
}

async function saveCandle(momentId) {
    console.log('Attempting to save candle for moment:', momentId);
    const message = document.getElementById('candle-message')?.value.trim() || '';
    const candleEmotion = document.getElementById('candle-emotion')?.value;
    if (!candleEmotion) {
        console.error('Candle emotion not selected');
        alert('Please select an emotion for the candle.');
        return;
    }
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
        document.querySelector('.modal')?.remove();
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
