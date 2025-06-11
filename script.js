let scene, camera, renderer, sun;
const planets = [];
const speeds = {};
const defaultSpeeds = {};
let selectedPlanet = null;
let paused = false;
let tooltip, raycaster, mouse;
let infoCard; // Info card element

const planetData = [
    { name: "Mercury", distance: 13, size: 1.2, color: 0xaaaaaa, speed: 0.02 },
    { name: "Venus", distance: 20, size: 1.7, color: 0xffcc66, speed: 0.015 },
    { name: "Earth", distance: 27, size: 2.2, color: 0x3399ff, speed: 0.01 },
    { name: "Mars", distance: 35, size: 2.8, color: 0xff3300, speed: 0.008 },
    { name: "Jupiter", distance: 43, size: 3.4, color: 0xff9966, speed: 0.006 },
    { name: "Saturn", distance: 52, size: 4, color: 0xffcc99, speed: 0.005 },
    { name: "Uranus", distance: 62, size: 4.7, color: 0x66ccff, speed: 0.004 },
    { name: "Neptune", distance: 75, size: 5.5, color: 0x3366ff, speed: 0.003 }
];

const clock = new THREE.Clock();
let mouseScreenX = 0;
let mouseScreenY = 0;

init();
animate();

function init() {
    // Scene & camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(10, 100, 160);
    camera.lookAt(-10, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x333333));
    scene.add(new THREE.PointLight(0xffffff, 1.2));

    // Sun
    const sunGeometry = new THREE.SphereGeometry(6, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Planets, orbits & controls
    const controls = document.getElementById('controls');
    planetData.forEach(data => {
        const geometry = new THREE.SphereGeometry(data.size, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: data.color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = {
            angle: Math.random() * Math.PI * 2,
            distance: data.distance,
            name: data.name
        };
        scene.add(mesh);
        planets.push(mesh);

        // Orbit path
        scene.add(createOrbitPath(data.distance));

        // Store speeds
        speeds[data.name] = data.speed;
        defaultSpeeds[data.name] = data.speed;

        // Controls: label, slider, numeric value
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.backgroundColor = 'violet';
        label.style.borderRadius = '5px';
        label.style.color = 'black';
        label.style.alignItems = 'center';
        label.style.marginBottom = '4px';
        label.textContent = `${data.name} Speed: `;

        const input = document.createElement('input');
        input.type = 'range';
        input.min = 0.001;
        input.max = 0.05;
        input.step = 0.001;
        input.value = data.speed;
        input.oninput = e => {
            speeds[data.name] = parseFloat(e.target.value);
            number.textContent = parseFloat(e.target.value).toFixed(3);
        };

        const number = document.createElement('span');
        number.textContent = data.speed.toFixed(3);
        number.style.marginLeft = '8px';
        number.style.width = '40px';

        label.appendChild(input);
        label.appendChild(number);
        controls.appendChild(label);
    });

    // Reset speeds button
    const resetBtn = document.createElement('button');
    resetBtn.style.cursor = 'pointer';
    resetBtn.style.backgroundColor = 'green';
    resetBtn.textContent = 'Reset Speeds';
    resetBtn.style.marginTop = '8px';
    resetBtn.onclick = () => {
        const labels = controls.querySelectorAll('label');
        labels.forEach(label => {
            const planetName = label.textContent.split(' ')[0];
            speeds[planetName] = defaultSpeeds[planetName];
            const input = label.querySelector('input');
            const number = label.querySelector('span');
            input.value = defaultSpeeds[planetName];
            number.textContent = defaultSpeeds[planetName].toFixed(3);
        });
    };
    controls.appendChild(resetBtn);

    // Pause button
    const pauseBtn = document.createElement('button');
    pauseBtn.style.width = '40px';
    pauseBtn.style.height = '40px';
    pauseBtn.style.border = 'none';
    pauseBtn.style.background = 'transparent';
    pauseBtn.style.cursor = 'pointer';
    pauseBtn.style.border = 'solid black';
    pauseBtn.title = 'Pause';
    const playIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="white"><polygon points="6,4 20,12 6,20" /></svg>`;
    const pauseIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    pauseBtn.innerHTML = pauseIcon;
    pauseBtn.onclick = () => {
        paused = !paused;
        pauseBtn.innerHTML = paused ? playIcon : pauseIcon;
    };
    controls.appendChild(pauseBtn);

    // Dark/light toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.style.width = '40px';
    toggleBtn.style.height = '40px';
    toggleBtn.style.marginTop = '-40px';
    toggleBtn.style.marginLeft = '45px';
    toggleBtn.style.border = 'none';
    toggleBtn.style.background = 'transparent';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.border = 'solid black';
    toggleBtn.title = 'Toggle Dark/Light Mode';
    const sunIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="orange"><circle cx="12" cy="12" r="5" /><g stroke="orange" stroke-width="2"><line x1="12" y1="1" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" /></g></svg>`;
    const moonIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="black"><path d="M21 12.79A9 9 0 0112.21 3a7 7 0 009 9.79z" /></svg>`;
    toggleBtn.innerHTML = sunIcon;
    toggleBtn.onclick = () => {
        const isLight = document.body.classList.toggle('light-mode');
        toggleBtn.innerHTML = isLight ? moonIcon : sunIcon;
    };
    controls.appendChild(toggleBtn);

    // Background stars
    addBackgroundStars();

    // Tooltip
    tooltip = document.getElementById('tooltip');
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Info card
    infoCard = document.createElement('div');
    infoCard.style.position = 'fixed';
    infoCard.style.display = 'none';
    infoCard.style.padding = '8px';
    infoCard.style.background = 'violet';
    infoCard.style.color = 'black';
    infoCard.style.borderRadius = '5px';
    infoCard.style.top = '50px';
    infoCard.style.right = '50px';
    infoCard.style.minWidth = '120px';
    infoCard.style.fontSize = '14px';
    infoCard.style.zIndex = '10';
    document.body.appendChild(infoCard);

    // Asteroid belt
    createAsteroidBelt(40, 50, 100);

    // Events
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onMouseClick);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onMouseWheel);
}

function createOrbitPath(radius) {
    const segments = 64;
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true });
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        positions.push(radius * Math.cos(angle), 0, radius * Math.sin(angle));
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return new THREE.LineLoop(geometry, material);
}

function createAsteroidBelt(innerRadius, outerRadius, count) {
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    for (let i = 0; i < count; i++) {
        const asteroid = new THREE.Mesh(geometry, material);
        const angle = Math.random() * Math.PI * 2;
        const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
        asteroid.position.x = distance * Math.cos(angle);
        asteroid.position.z = distance * Math.sin(angle);
        asteroid.position.y = (Math.random() - 0.5) * 2;
        scene.add(asteroid);
    }
}

function addBackgroundStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3000;
    const positions = [];
    for (let i = 0; i < starCount; i++) {
        positions.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
    scene.add(new THREE.Points(starGeometry, starMaterial));
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    mouseScreenX = event.clientX;
    mouseScreenY = event.clientY;
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    camera.updateMatrixWorld();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);
    if (intersects.length > 0) {
        selectedPlanet = intersects[0].object;
        const offset = new THREE.Vector3(0, 5, 10);
        camera.position.copy(selectedPlanet.position.clone().add(offset));
        camera.lookAt(selectedPlanet.position);

        // Show planet info
        const data = planetData.find(p => p.name === selectedPlanet.userData.name);
        infoCard.innerHTML = `
            <strong>${data.name}</strong><br>
            Distance: ${data.distance}<br>
            Size: ${data.size}
        `;
        infoCard.style.display = 'block';
    } else {
        selectedPlanet = null;
        camera.position.set(10, 100, 160);
        camera.lookAt(-10, 0, 0);

        // Hide planet info
        infoCard.style.display = 'none';
    }
}

function onMouseWheel(event) {
    const zoomSpeed = 0.05;
    camera.position.addScaledVector(camera.getWorldDirection(new THREE.Vector3()), event.deltaY * zoomSpeed);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (!paused) {
        planets.forEach((planet, index) => {
            const data = planetData[index];
            const speed = speeds[data.name];
            planet.userData.angle += speed * delta * 60;
            planet.position.x = planet.userData.distance * Math.cos(planet.userData.angle);
            planet.position.z = planet.userData.distance * Math.sin(planet.userData.angle);

            // Subtle rotation on own axis
            planet.rotation.y += 0.01;
        });
    }

    // Tooltip logic
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);
    if (intersects.length > 0) {
        const planet = intersects[0].object;
        tooltip.style.display = 'block';
        tooltip.style.backgroundColor = 'violet';
        tooltip.style.color = 'black';
        tooltip.style.borderRadius = '5px';
        tooltip.style.left = `${mouseScreenX + 5}px`;
        tooltip.style.top = `${mouseScreenY + 5}px`;
        tooltip.textContent = planet.userData.name;
    } else {
        tooltip.style.display = 'none';
    }

    renderer.render(scene, camera);
}
