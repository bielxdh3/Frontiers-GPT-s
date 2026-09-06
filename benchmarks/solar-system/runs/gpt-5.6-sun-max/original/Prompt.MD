Build a complete, polished, interactive 3D Solar System experience that runs directly inside the browser.

Do not simply create a static visualization. Treat this as a finished interactive product.

## Core goal

Create an immersive model of the Solar System where the user can freely explore space, inspect planets, control time, compare celestial bodies, and understand the structure of the system through interaction.

Choose the most appropriate technologies and implementation approach for the environment. Do not require the user to install anything, configure a local server, provide API keys, or manually assemble project files.

The final result should run directly in the available browser preview.

## Visual experience

Create a visually impressive deep-space environment with:

* The Sun
* Mercury
* Venus
* Earth
* The Moon
* Mars
* Jupiter
* Saturn and its rings
* Uranus
* Neptune
* A dense starfield with visible depth
* Subtle atmospheric effects where appropriate
* Lighting generated naturally from the Sun
* Planet shadows and illuminated hemispheres
* Smooth animation and camera movement

Each celestial body should have a distinct and recognizable appearance.

Use high-quality procedural materials, generated visual details, available assets, or another suitable technique. Avoid a primitive result made only from plain colored spheres.

The experience should feel cinematic while remaining clear and usable.

## Scale system

Real astronomical scale makes the planets almost impossible to see in an interactive browser visualization.

Solve this intelligently.

Include two modes:

### Exploration Scale

Use visually adjusted planet sizes and orbital distances so the entire Solar System is enjoyable to explore.

### Relative Scale

Show more scientifically meaningful relative proportions and clearly explain which dimensions are still compressed or adjusted.

Allow the user to switch between these modes.

## Orbital simulation

All planets should:

* Orbit the Sun
* Rotate around their own axes
* Move at different orbital speeds
* Start at different orbital positions
* Preserve smooth motion at every simulation speed

The Moon must orbit the Earth while the Earth continues orbiting the Sun.

Saturn's rings must remain correctly attached and oriented relative to the planet.

Use a coherent simulation model. Avoid arbitrary animations that visibly break when time speed changes.

## Time controls

Add a simulation control panel with:

* Pause and resume
* Reverse time
* 1× speed
* 10× speed
* 100× speed
* 1,000× speed
* A custom speed control
* Reset simulation

Display the current simulation speed clearly.

## Camera and navigation

The user should be able to:

* Rotate the camera freely
* Zoom in and out
* Pan when appropriate
* Select a celestial body
* Smoothly travel to the selected object
* Follow an object while it continues moving
* Return to a full Solar System overview

Camera transitions should be animated and smooth rather than teleporting instantly.

When following a planet, maintain a useful viewing distance automatically.

## Planet interaction

Clicking or selecting a celestial body should open an information panel containing:

* Name
* Type
* Diameter
* Distance from the Sun
* Orbital period
* Rotation period
* Number of known moons
* Average surface or cloud-top temperature
* One concise interesting fact

Clearly indicate when a value is approximate.

The selected object should also receive a subtle visual highlight without destroying immersion.

## Search and navigation panel

Create an object navigator containing every major celestial body.

The user should be able to:

* Search by name
* Select an object
* Jump to it
* Start following it

Include the Moon as a separate selectable object.

## Orbit visualization

Show orbital paths with subtle lines.

Add controls to:

* Show or hide all orbit lines
* Show only the selected object's orbit
* Hide orbit lines entirely

Orbit lines should remain understated and should not overwhelm the scene.

## Labels

Add optional floating labels for celestial bodies.

Labels should:

* Remain readable
* Avoid excessive overlap
* Scale or fade intelligently based on camera distance
* Be individually toggleable through a global control

## Comparison mode

Add a comparison feature where the user can select two celestial bodies.

Display a clear visual comparison including:

* Diameter
* Mass
* Gravity
* Length of day
* Length of year
* Average temperature

Include a visual size comparison using scaled circles, spheres, or another intuitive representation.

## Guided tour

Create a guided tour mode.

The tour should smoothly move through the Solar System and visit at least:

1. The Sun
2. Earth and the Moon
3. Mars
4. Jupiter
5. Saturn
6. Uranus
7. Neptune

Each stop should briefly explain what makes the object notable.

Allow the user to pause or exit the tour at any moment.

## Interface design

Create a refined modern interface inspired by professional astronomy and space exploration software.

The interface should include:

* A clean dark visual language
* Semi-transparent panels
* Strong typography hierarchy
* Clear iconography
* Responsive controls
* Smooth transitions
* Tooltips where useful

Avoid clutter.

The 3D scene should remain the main focus.

## Responsive behavior

The experience must work on:

* Desktop
* Tablet
* Mobile

Adapt the interface rather than merely shrinking desktop panels.

On mobile:

* Use compact controls
* Use collapsible panels
* Preserve touch navigation
* Keep important actions reachable

## Performance

Optimize the experience carefully.

Target smooth interaction on typical consumer hardware.

Use appropriate strategies such as:

* Efficient geometry
* Reused assets
* Sensible texture resolution
* Reduced unnecessary updates
* Adaptive visual quality when useful

Do not sacrifice the entire visual experience for optimization, but avoid obvious waste.

## Polish

Add details that make the experience feel complete:

* Loading state
* Helpful first-use instructions
* Smooth panel transitions
* Hover and selection feedback
* Graceful error handling
* Empty-state handling where relevant
* Consistent visual spacing
* A reset-view action
* Keyboard shortcuts on desktop

Suggested shortcuts:

* Space: pause or resume
* R: reset view
* O: toggle orbit lines
* L: toggle labels
* Escape: close the current panel or exit guided mode

## Scientific honesty

Accuracy matters, but usability matters too.

Use trustworthy astronomical values and distinguish between:

* Scientifically meaningful values
* Visually compressed distances
* Exaggerated object sizes
* Simplified orbital behavior

Include a compact “About this model” section explaining these compromises.

Do not pretend that a visually optimized model is perfectly to scale.

## Final quality bar

The result should feel like a real interactive product, not a coding demonstration.

Before considering the work complete:

* Test all controls
* Fix broken interactions
* Check mobile layout
* Check camera behavior
* Check object selection while planets are moving
* Check pause, reverse, and high-speed simulation
* Remove placeholder content
* Remove obviously unfinished UI
* Make sure the initial view is visually impressive

Make thoughtful product and technical decisions independently.

Do not stop at a plan, mockup, explanation, or code snippet. Build the complete working experience directly in the browser preview.
