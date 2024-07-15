'use strict';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// DOM VARIABLES 
const DOM_form = document.querySelector('.form');
const DOM_containerWorkouts = document.querySelector('.workouts');
const DOM_inputType = document.querySelector('.form__input--type');
const DOM_inputDistance = document.querySelector('.form__input--distance');
const DOM_inputDuration = document.querySelector('.form__input--duration');
const DOM_inputCadence = document.querySelector('.form__input--cadence');
const DOM_inputElevation = document.querySelector('.form__input--elevation');
const DOM_inputDate = document.querySelector('.form__input--date')
const DOM_editIcon = document.querySelector('.edit-icon');
const DOM_deleteIcon = document.querySelector('.delete-icon');
const DOM_editIconInForm = document.querySelector('.edition-mode-icon');
const DOM_createIconInForm = document.querySelector('.creation-mode-icon');
const DOM_map = document.getElementById('map');

// CREATING THE CLASSES, ARCHITECTURE
class Workout {
    constructor(distance, duration, workoutDate, workoutCoords) {
        this.distance = distance;
        this.duration = duration;
        this.workoutDate = workoutDate; // the user can add a past workout or a workout that'll done in the future, hence the property
        this.creationDate = new Date(); // this date's timestamp (in milliseconds) is the workout's ID
        this.workoutCoords = workoutCoords;
    }

    get isPast() { // past workouts should be rendered with lower opacity, hence the getter, it simplifies things
        return (this.creationDate - this.workoutDate > 0);
    }
}

class RunningWorkout extends Workout {
    constructor(distance, duration, cadence, workoutDate, workoutCoords) {
        super(distance, duration, workoutDate, workoutCoords);
        this.cadence = cadence;
    }

    get type() {
        return "running";
    }

    get pace() {
        return this.duration / this.distance; // min/km
    }

    get mapMarker() {
        if (this._mapMarker) {
            return this._mapMarker;
        }

        const greenIcon = new L.Icon({
            iconUrl: './assets/images/marker-green.png',
            shadowUrl: './assets/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        this.mapMarker = new L.marker([this.workoutCoords.lat, this.workoutCoords.lng], {icon: greenIcon, opacity: (this.isPast) ? 0.37 : 1});
        return this._mapMarker;
    }

    get mapPopup() {
        if (this._mapPopup) {
            return this._mapPopup;
        }

        this.mapPopup = new L.popup({autoClose: false, closeOnClick: false, className: "running-popup", content: `🏃‍♂️ Running on ${months[this.workoutDate.getMonth()]} ${this.workoutDate.getDate()}, ${this.workoutDate.getFullYear()}`});
        return this._mapPopup;
    }

    set mapMarker(value) {
        this._mapMarker = value;
    }

    set mapPopup(value) {
        this._mapPopup = value;
    }
}

class CyclingWorkout extends Workout {
    constructor(distance, duration, elevation, workoutDate, workoutCoords) {
        super(distance, duration, workoutDate, workoutCoords);
        this.elevation = elevation;
    }

    get type() {
        return "cycling";
    }

    get speed() {
        return this.distance / (this.duration / 60); // km/h
    }

    get mapMarker() {
        if (this._mapMarker) {
            return this._mapMarker;
        }

        const goldIcon = new L.Icon({
            iconUrl: './assets/images/marker-gold.png',
            shadowUrl: './assets/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        this.mapMarker = new L.marker([this.workoutCoords.lat, this.workoutCoords.lng], {icon: goldIcon, opacity: (this.isPast ? 0.45 : 1)});
        return this._mapMarker;
    }

    get mapPopup() {
        if (this._mapPopup) {
            return this._mapPopup;
        }

        this.mapPopup = new L.popup({autoClose: false, closeOnClick: false, className: "cycling-popup", content: `🚴‍♀️ Cycling on ${months[this.workoutDate.getMonth()]} ${this.workoutDate.getDate()}, ${this.workoutDate.getFullYear()}`});
        return this._mapPopup;
    }

    set mapMarker(value) {
        this._mapMarker = value;
    }

    set mapPopup(value) {
        this._mapPopup = value;
    }
}

class App {
    #workouts = [];
    #selectedCoords = {};
    #map;
    #beingEditedId = null;

    constructor() {
        this._getLocation(); // app initializer
        
        // event listeners
        DOM_inputType.addEventListener("change", this._toggleCadenceElevation.bind(this));
        DOM_form.addEventListener("submit", (e) => {            
            e.preventDefault();
            const newWorkout = (this.#beingEditedId) ? this._newWorkout(true) : this._newWorkout();
            if (newWorkout) { // if the input is invalid, newWorkout will be none, hence the conditional       
                this._renderWorkout(newWorkout);
            } else return;
            DOM_inputDistance.value = DOM_inputDuration.value = DOM_inputCadence.value = DOM_inputElevation.value = DOM_inputDate.value = '';
            DOM_form.style.display = "none"; // why? to cancel the animation when the form is submitted
            DOM_form.classList.add("hidden"); // the transition lasts 1 second
            setTimeout(() => DOM_form.style.display = "grid", 1000); // so we have to add the grid back only after 1sec
        });
        // why an arrow function? because it'll take the outer this, which is exactly what we need
        DOM_containerWorkouts.addEventListener("click", this._moveToWorkout.bind(this));
        DOM_containerWorkouts.addEventListener("click", (e) => { // edition and deletion
            const targetWorkoutDOM = e.target.closest(".workout");
            if (!targetWorkoutDOM) return;
            const targetWorkoutObj = this.#workouts.find((workout) => targetWorkoutDOM.dataset.id == workout.creationDate.getTime());

            if (e.target.closest("div").classList.contains("edit-icon")) this._editWorkout(targetWorkoutObj);
            if (e.target.closest("div").classList.contains("delete-icon")) this._deleteWorkout(targetWorkoutObj);
        });
    }

    _getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._renderMap.bind(this), () => alert("The geolocation access was not granted."));
        }
    }

    _renderMap(position) {
            // the position argument is automatically passed to the function when it is called by navigator.geolocation.getCurrentPosition
        ({latitude: this.#selectedCoords.lat, longitude: this.#selectedCoords.lng} = position.coords);

            // -------- displaying the map using the leaflet library ----------
            // instantiating the map that'll be added to the container with the 'map' ID, L.map('id')
            // most leaflet objects return the map object, which allows chaining methods together
        this.#map = L.map('map').setView([this.#selectedCoords.lat, this.#selectedCoords.lng], 15); // 15 is the zoom level!    
            // setting a tile layer (it can be any) and adding it to the map object
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(this.#map);
            // adding click handler to the map (it'll open the form by calling _renderForm)
        this.#map.on("click", (mapEvent) => {
            // disable edition mode in case its open
            this.#beingEditedId = null;
            DOM_createIconInForm.style.display = "initial";
            DOM_editIconInForm.style.display = "none";
            this._renderForm(mapEvent);
        });
    }

    _renderForm(mapEvent) {
        // this mapEvent is automatically passed to the handler function of map.on
        ({lat: this.#selectedCoords.lat, lng: this.#selectedCoords.lng} = mapEvent.latlng); // update currently selected coords
        DOM_form.classList.remove("hidden"); // show form
        DOM_inputDistance.focus();
    }

    _toggleCadenceElevation() {
        DOM_inputCadence.parentNode.classList.toggle("form__row--hidden");
        DOM_inputElevation.parentNode.classList.toggle("form__row--hidden");
        DOM_inputDistance.focus();
    }    

    _newWorkout(edition) {
        // edition is a boolean that will tell if the function will create a new workout or edit an existing one
        let workout;

        // input validation
        function validateAllNumericInput(...inputs) {
            return inputs.every((input) => !Number.isNaN(input));
        }

        function validatePositiveNumericInput(...inputs) { // true for valid and false for invalid
            return inputs.every((input) => validateAllNumericInput(input) && input > 0);
        }

        const type = DOM_inputType.value;
        const distance = Number.parseFloat(DOM_inputDistance.value);
        const duration = Number.parseFloat(DOM_inputDuration.value);
        const cadence = Number.parseFloat(DOM_inputCadence.value);
        const elevation = Number.parseFloat(DOM_inputElevation.value);
        const date = DOM_inputDate.valueAsNumber;

        if (!date) {
            alert("A date must be selected on the calendar.");
            return;
        }

        switch (type) {
            case "running":
                if (!validatePositiveNumericInput(distance, duration, cadence)) { // validation guard clause            
                    alert(`The distance, duration and cadence must be positive numbers!`);
                    return;
                }
                workout = new RunningWorkout(distance, duration, cadence, new Date(date), { lat: this.#selectedCoords.lat, lng: this.#selectedCoords.lng});
                break;
            case "cycling":
                if (!validatePositiveNumericInput(distance, duration)) { // validation guard clause            
                    alert(`The distance and duration must be positive numbers!`);
                    return;
                }
                if (!validateAllNumericInput(elevation)) {
                    alert(`The elevation must be a number!`);
                    return;
                }
                workout = new CyclingWorkout(distance, duration, elevation, new Date(date), { lat: this.#selectedCoords.lat, lng: this.#selectedCoords.lng});
        }

        
        if (edition) {
            const oldWorkoutIndex = this.#workouts.findIndex((workout) => workout.creationDate.getTime() == this.#beingEditedId);
            const oldWorkoutObj = this.#workouts[oldWorkoutIndex];
            // new workout coords should come from old workout, not from the last selected coords
            ({ lat: workout.workoutCoords.lat, lng: workout.workoutCoords.lng} = oldWorkoutObj.workoutCoords);
            // new workout creation date must be the same as the old workout's, edition !== creation
            workout.creationDate = new Date(this.#beingEditedId);

            oldWorkoutObj.mapMarker.remove(); // remove old marker from DOM
            oldWorkoutObj.mapPopup.remove(); // remove old popup from DOM
            this.#workouts.splice(oldWorkoutIndex, 1, workout); // bye bye old workout, replaced by new workout in the same position
            this.#beingEditedId = null; // stop edition mode
        } else this.#workouts.push(workout); // since there's no edition, workout go to the end of the array

        return workout;
    }

    _renderWorkout(workout) {        
        const type = workout.type;
        const icon1 = (type === "running") ? "🏃‍♂️" : (type === "cycling") ? "🚴‍♀️" : "";
        const icon2 = (type === "running") ? "🦶🏼" : (type === "cycling") ? "⛰" : "";

        const html = `<li class="workout workout--${type}" data-id="${workout.creationDate.getTime()}">
            <div class="edit-icon"><svg class="feather feather-edit" fill="none" height="16" stroke="#00c46a" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
            <div class="delete-icon"><svg id="Layer_1" height="16" width="16" style="enable-background:new 0 0 24 24;" version="1.1" viewBox="0 0 24 24" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><style type="text/css">.st0{fill:none;stroke:red;stroke-width:1.6724;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;}.st1{fill:none;stroke:red;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;}.st2{fill:none;stroke:red;stroke-width:1.5;stroke-linejoin:round;stroke-miterlimit:10;}</style><g><g><g><path class="st1" d="M17.7,23.3H6.3c-1,0-1.7-0.8-1.7-1.7V6.6h14.8v14.9C19.4,22.5,18.6,23.3,17.7,23.3z"/></g><g><path class="st1" d="M20.4,6V4.2c0-0.7-0.6-1.3-1.3-1.3h-3.7L15,1.4C14.8,1,14.5,0.8,14,0.8H10C9.6,0.8,9.2,1,9,1.4L8.6,2.8H4.9     c-0.7,0-1.3,0.6-1.3,1.3V6c0,0.3,0.3,0.6,0.6,0.6h15.6C20.2,6.6,20.4,6.3,20.4,6z"/></g></g><g><g><line class="st1" x1="8.8" x2="8.8" y1="10.2" y2="19.7"/></g><g><line class="st1" x1="12" x2="12" y1="10.2" y2="19.7"/></g><g><line class="st1" x1="15.2" x2="15.2" y1="10.2" y2="19.7"/></g></g></g></svg></div>
            <h2 class="workout__title">${workout.type[0].toUpperCase() + workout.type.slice(1)} on ${months[workout.workoutDate.getMonth()]} ${workout.workoutDate.getDate()}, ${workout.workoutDate.getFullYear()}</h2>
            <div class="workout__details">
            <span class="workout__icon">${icon1}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${(type === "running") ? workout.pace.toFixed(1) : (type === "cycling") ? workout.speed.toFixed(1) : ""}</span>
            <span class="workout__unit">${(type === "running") ? "min/km" : (type === "cycling") ? "km/h" : ""}</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">${icon2}</span>
            <span class="workout__value">${(type === "running") ? workout.cadence : (type === "cycling") ? workout.elevation : ""}</span>
            <span class="workout__unit">${(type === "running") ? "spm" : (type === "cycling") ? "m" : ""}</span>
            </div>
        </li>`;

        // this is in order to enable edition feature without having to render all the workouts again
        // if an edition is happening, then the new workout that's being rendered has the same ID as its old version that is already in the DOM
        // why all this? to remember the workout's position and place the edited version right there!
        const workoutAlreadyInDOM = Array.from(DOM_containerWorkouts.querySelectorAll("li")).find((workoutDOM) => workoutDOM.dataset.id == workout.creationDate.getTime());

        if (workoutAlreadyInDOM) {
            const previousSibling = workoutAlreadyInDOM.previousSibling; // to save the workout's position in the DOM
            workoutAlreadyInDOM.remove(); // that's the workout before the edition! долой его
            previousSibling.insertAdjacentHTML("afterend", html); // render on list in the previous position
            workout.mapMarker.bindPopup(workout.mapPopup).addTo(this.#map).openPopup(); // render new marker
        } else {
            DOM_form.insertAdjacentHTML("afterend", html); // not edition? just put it at the beginning of the list
            workout.mapMarker.bindPopup(workout.mapPopup).addTo(this.#map).openPopup(); // add marker with open popup
        } 

    }

    /*
    _renderAllWorkouts() {
        Array.from(DOM_containerWorkouts.querySelectorAll("li")).forEach((li) => li.remove());
        Array.from(document.querySelectorAll(".leaflet-marker-icon")).forEach((icon) => icon.remove());
        Array.from(document.querySelectorAll(".leaflet-popup")).forEach((popup) => popup.remove());
        this.#workouts.forEach((workout) => {
            workout.displayWorkout();
            workout.displayMarker(this.#map);
        });
    }
    */

    _moveToWorkout(e) {
        if (e.target.closest("div").classList.contains("delete-icon")) return; // if workout is being removed, don't move to it

        const targetWorkoutContainer = e.target.closest("li");
        if (targetWorkoutContainer) {
            if (!targetWorkoutContainer.classList.contains("workout")) return;
        } else return; // guard clause
        const targetWorkoutId = targetWorkoutContainer.dataset.id;
        const targetWorkoutObj = this.#workouts.find((workoutObj) => workoutObj.creationDate.getTime() == targetWorkoutId);
        const targetWorkoutCoords = targetWorkoutObj.workoutCoords;
        this.#map.setView([targetWorkoutCoords.lat, targetWorkoutCoords.lng], this.#map.getZoom(), { animate: true, pan: { duration: 0.8 } });
    }

    _editWorkout(workout) {
        DOM_containerWorkouts.scrollTo(0, 0);
        this.#beingEditedId = workout.creationDate.getTime(); // activate edition mode
        DOM_form.classList.remove("hidden");
        DOM_editIconInForm.style.display = "initial";
        DOM_createIconInForm.style.display = "none";

        DOM_inputDistance.value = workout.distance;
        DOM_inputDuration.value = workout.duration;
        DOM_inputDate.valueAsNumber = workout.workoutDate;

        switch (workout.type) {
            case "running":
                DOM_inputCadence.parentNode.classList.remove("form__row--hidden");
                DOM_inputElevation.parentNode.classList.add("form__row--hidden");
                DOM_inputType.value = "running";
                DOM_inputCadence.value = workout.cadence;
                DOM_inputElevation.value = '';
                break;
            case "cycling":
                DOM_inputCadence.parentNode.classList.add("form__row--hidden");
                DOM_inputElevation.parentNode.classList.remove("form__row--hidden");
                DOM_inputType.value = "cycling";
                DOM_inputCadence.value = '';
                DOM_inputElevation.value = workout.elevation;
        }
    }

    _deleteWorkout(workout) {        
        const targetWorkoutIndex = this.#workouts.findIndex((workoutInArray) => workout === workoutInArray);
        const targetWorkoutDOM = Array.from(DOM_containerWorkouts.querySelectorAll(".workout")).find((workoutDOM) => workoutDOM.dataset.id == workout.creationDate.getTime());
        workout.mapMarker.remove();
        targetWorkoutDOM.remove();
        this.#workouts.splice(targetWorkoutIndex, 1); // remove from DB

        if (workout.creationDate.getTime() == this.#beingEditedId) { // if user removes the workout that's being edited
            this.#beingEditedId = null;
            DOM_form.reset();
            DOM_form.classList.add("hidden");
            DOM_editIconInForm.style.display = "none";
            DOM_createIconInForm.style.display = "initial";
        }
    }
}

const app = new App();