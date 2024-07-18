'use strict';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// DOM VARIABLES 
const DOM_form = document.querySelector('.form');
const DOM_closeFormIcon = document.querySelector('.close-form-icon');
const DOM_changeViewPane = document.querySelector('.change-view-pane');
const DOM_containerWorkouts = document.querySelector('.workouts');
const DOM_inputType = document.querySelector('.form__input--type');
const DOM_inputDistance = document.querySelector('.form__input--distance');
const DOM_inputDuration = document.querySelector('.form__input--duration');
const DOM_inputCadence = document.querySelector('.form__input--cadence');
const DOM_inputElevation = document.querySelector('.form__input--elevation');
const DOM_inputDate = document.querySelector('.form__input--date')
const DOM_editIcon = document.querySelector('.edit-icon');
const DOM_deleteIcon = document.querySelector('.delete-icon');
const DOM_editIconInForm = document.querySelector('.edit-mode-icon');
const DOM_createIconInForm = document.querySelector('.creation-mode-icon');
const DOM_deleteAllIcon = document.querySelector('.delete-all-icon');
const DOM_filterIcon = document.querySelector('.filter-icon');
const DOM_filterPaneArrow = document.querySelector('.filter-pane__arrow');
const DOM_filterPane = document.querySelector('.filter-pane');
const DOM_sortIcon = document.querySelector('.sort-icon')
const DOM_sortPaneArrow = document.querySelector('.sort-pane__arrow');
const DOM_sortPane = document.querySelector('.sort-pane');
const DOM_map = document.getElementById('map');

// CREATING THE CLASSES, ARCHITECTURE
class Workout {
    constructor(distance, duration, date, workoutCoords) {
        this.distance = distance;
        this.duration = duration;
        this.date = date; // the user can add a past workout or a workout that'll done in the future, hence the property
        this.creation = new Date(); // this date's timestamp (in milliseconds) is the workout's ID
        this.workoutCoords = workoutCoords;
    }

    get isPast() { // past workouts should be rendered with lower opacity, hence the getter, it simplifies things
        return (new Date() - this.date > 0);
    }

    get tags() {
        const tagsArray = [`${this.type}`] // initial tag

        // tests for tags, add more as the need of new tags grows
        if (this.date.getFullYear() === new Date().getFullYear() && this.date.getMonth() === new Date().getMonth() && this.date.getDate() === new Date().getDate()) {
            tagsArray.push("today");
        } else if (new Date() - this.date > 0) {
            tagsArray.push("past");
        } else {
            tagsArray.push("future"); 
        }

        // ------------

        return (tagsArray.toSorted());
    }
}

class RunningWorkout extends Workout {
    type = "running";

    constructor(distance, duration, cadence, date, workoutCoords) {
        super(distance, duration, date, workoutCoords);
        this.cadence = cadence;
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

        this.mapMarker = new L.marker([this.workoutCoords.lat, this.workoutCoords.lng], {icon: greenIcon, opacity: (this.tags.includes("past")) ? 0.37 : 1});
        return this._mapMarker;
    }

    get mapPopup() {
        if (this._mapPopup) {
            return this._mapPopup;
        }

        this.mapPopup = new L.popup({autoClose: false, closeOnClick: false, className: "running-popup", content: `🏃‍♂️ Running on ${months[this.date.getMonth()]} ${this.date.getDate()}, ${this.date.getFullYear()}`});
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
    type = "cycling";

    constructor(distance, duration, elevation, date, workoutCoords) {
        super(distance, duration, date, workoutCoords);
        this.elevation = elevation;
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

        this.mapMarker = new L.marker([this.workoutCoords.lat, this.workoutCoords.lng], {icon: goldIcon, opacity: (this.tags.includes("past") ? 0.45 : 1)});
        return this._mapMarker;
    }

    get mapPopup() {
        if (this._mapPopup) {
            return this._mapPopup;
        }

        this.mapPopup = new L.popup({autoClose: false, closeOnClick: false, className: "cycling-popup", content: `🚴‍♀️ Cycling on ${months[this.date.getMonth()]} ${this.date.getDate()}, ${this.date.getFullYear()}`});
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
    #currentSortingObj = {mode: "descending", field: "creation"};
    #currentTagsArray = []; // this array is updated every time the user changes the filter options
    // in the _renderWorkout function, this array will determine whether the workout obj passed as argument will be rendered or removed;
    #stringifyReplacer = function(key, value) {
        if (key === "_mapPopup" || key === "_mapMarker") return null; // to ignore circular references
        return value; // the map and marker properties will be rebuilt afterwards, so don't having them is not a problem at all
    }

    constructor() {
        this._getLocation(); // app initializer
        
        // event listeners
        DOM_inputType.addEventListener("change", this._toggleCadenceElevation.bind(this));

        // why an arrow function? because it'll take the outer this, which is exactly what we need
        DOM_form.addEventListener("submit", (e) => {            
            e.preventDefault();
            const newWorkout = (this.#beingEditedId) ? this._newWorkout(true) : this._newWorkout();
            if (newWorkout) { // if the input is invalid, newWorkout will be none, hence the conditional       
                this._renderWorkouts();
            } else return;
            this._resetForm();
            this._hideForm();
        });

        // CLOSE FORM
        DOM_closeFormIcon.addEventListener("click", () => {
            this._resetForm();
            this._hideForm();
        });
        
        // MOVE TO WORKOUT
        DOM_containerWorkouts.addEventListener("click", this._moveToWorkout.bind(this));

        // EDIT AND DELETE WORKOUT
        DOM_containerWorkouts.addEventListener("click", (e) => { 
            const targetWorkoutDOM = e.target.closest(".workout");
            if (!targetWorkoutDOM) return;
            const targetWorkoutObj = this.#workouts.find((workout) => targetWorkoutDOM.dataset.id == workout.creation.getTime());

            if (e.target.closest("div").classList.contains("edit-icon")) this._editWorkout(targetWorkoutObj);
            if (e.target.closest("div").classList.contains("delete-icon")) this._deleteWorkout(targetWorkoutObj);
        });

        // DELETE ALL
        DOM_deleteAllIcon.addEventListener("click", this._deleteAllWorkouts.bind(this));
        
        // FILTER
        DOM_filterPane.addEventListener("click", this._updateFilters.bind(this));
        DOM_filterIcon.addEventListener("click", this._openFilterPane.bind(this));
        document.addEventListener("click", this._hideFilterPane.bind(this));
        
        // SORT
        DOM_sortPane.addEventListener("click", this._updateSorting.bind(this));
        DOM_sortIcon.addEventListener("click", this._openSortPane.bind(this));
        document.addEventListener("click", this._hideSortPane.bind(this));
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
            ({lat: this.#selectedCoords.lat, lng: this.#selectedCoords.lng} = mapEvent.latlng);
            this._renderForm();
        });

        // get and build data from local storage
        const flattenedWorkouts = JSON.parse(localStorage.getItem('workouts')); // array
        if (!flattenedWorkouts) return;
        flattenedWorkouts.forEach((workout) => {
            let newWorkout;
            switch (workout.type) { 
                case "running":
                    newWorkout = new RunningWorkout(workout.distance, workout.duration, workout.cadence, new Date(workout.date), {lat: workout.workoutCoords.lat, lng: workout.workoutCoords.lng});
                    newWorkout.creation = new Date(workout.creation); // JSON stringify automatically converts dates to ISO strings
                    break;
                case "cycling":
                    newWorkout = new CyclingWorkout(workout.distance, workout.duration, workout.elevation, new Date(workout.date), {lat: workout.workoutCoords.lat, lng: workout.workoutCoords.lng});
                    newWorkout.creation = new Date(workout.creation);
            }
            this.#workouts.push(newWorkout);
        });
        this._renderWorkouts();
    }

    _renderForm() {
        DOM_form.classList.remove("hidden"); // show form
        DOM_inputDistance.focus();
    }

    _hideForm() {
        DOM_form.style.display = "none"; // why? to cancel the animation when the form is submitted
        DOM_form.classList.add("hidden"); // the transition lasts 1 second
        setTimeout(() => DOM_form.style.display = "grid", 1000); // so we have to add the grid back only after 1sec
    };

    _resetForm() {
        DOM_form.reset();
        DOM_inputCadence.parentNode.classList.remove("form__row--hidden");
        DOM_inputElevation.parentNode.classList.add("form__row--hidden");

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
            const oldWorkoutIndex = this.#workouts.findIndex((workout) => workout.creation.getTime() == this.#beingEditedId);
            const oldWorkoutObj = this.#workouts[oldWorkoutIndex];
            // new workout coords should come from old workout, not from the last selected coords
            ({ lat: workout.workoutCoords.lat, lng: workout.workoutCoords.lng} = oldWorkoutObj.workoutCoords);
            // new workout creation date must be the same as the old workout's, edition !== creation
            workout.creation = new Date(this.#beingEditedId);

            oldWorkoutObj.mapMarker.remove(); // remove old marker from DOM
            oldWorkoutObj.mapPopup.remove(); // remove old popup from DOM
            this.#workouts.splice(oldWorkoutIndex, 1, workout); // bye bye old workout, replaced by new workout in the same position
            this.#beingEditedId = null; // stop edition mode
        } else this.#workouts.push(workout); // since there's no edition, workout go to the end of the array

        localStorage.setItem('workouts', JSON.stringify(this.#workouts, this.#stringifyReplacer));
        return workout;
    }

    _renderWorkouts() {
        Array.from(DOM_containerWorkouts.querySelectorAll('.workout')).forEach((workout) => {
            workout.remove();
            this.#workouts.find((workoutObj) => workoutObj.creation.getTime() == workout.dataset.id).mapMarker.remove();
        });

        let workoutsToRender = this.#workouts.filter((workout) => this.#currentTagsArray.length == 0 || this.#currentTagsArray.every((tag) => workout.tags.includes(tag)));

        workoutsToRender = this._getSortedWorkoutsArray(workoutsToRender);

        workoutsToRender.forEach((workout) => {
            const type = workout.type;
            const icon1 = (type === "running") ? "🏃‍♂️" : (type === "cycling") ? "🚴‍♀️" : "";
            const icon2 = (type === "running") ? "🦶🏼" : (type === "cycling") ? "⛰" : "";
    
            const html = `<li class="workout workout--${type}" data-id="${workout.creation.getTime()}">
                <div class="edit-icon"><svg class="feather feather-edit" fill="none" height="16" stroke="#00c46a" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
                <div class="delete-icon"><svg id="Layer_1" height="16" width="16" style="enable-background:new 0 0 24 24;" version="1.1" viewBox="0 0 24 24" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><style type="text/css">.st0{fill:none;stroke:red;stroke-width:1.6724;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;}.st1{fill:none;stroke:red;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;}.st2{fill:none;stroke:red;stroke-width:1.5;stroke-linejoin:round;stroke-miterlimit:10;}</style><g><g><g><path class="st1" d="M17.7,23.3H6.3c-1,0-1.7-0.8-1.7-1.7V6.6h14.8v14.9C19.4,22.5,18.6,23.3,17.7,23.3z"/></g><g><path class="st1" d="M20.4,6V4.2c0-0.7-0.6-1.3-1.3-1.3h-3.7L15,1.4C14.8,1,14.5,0.8,14,0.8H10C9.6,0.8,9.2,1,9,1.4L8.6,2.8H4.9     c-0.7,0-1.3,0.6-1.3,1.3V6c0,0.3,0.3,0.6,0.6,0.6h15.6C20.2,6.6,20.4,6.3,20.4,6z"/></g></g><g><g><line class="st1" x1="8.8" x2="8.8" y1="10.2" y2="19.7"/></g><g><line class="st1" x1="12" x2="12" y1="10.2" y2="19.7"/></g><g><line class="st1" x1="15.2" x2="15.2" y1="10.2" y2="19.7"/></g></g></g></svg></div>
                <h2 class="workout__title">${workout.type[0].toUpperCase() + workout.type.slice(1)} on ${months[workout.date.getMonth()]} ${workout.date.getDate()}, ${workout.date.getFullYear()}</h2>
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

            DOM_form.insertAdjacentHTML("afterend", html);
            workout.mapMarker.bindPopup(workout.mapPopup).addTo(this.#map).openPopup();
        })
    };

    _moveToWorkout(e) {
        if (e.target.closest("div").classList.contains("delete-icon")) return; // if workout is being removed, don't move to it

        const targetWorkoutContainer = e.target.closest("li");
        if (targetWorkoutContainer) {
            if (!targetWorkoutContainer.classList.contains("workout")) return;
        } else return; // guard clause
        const targetWorkoutId = targetWorkoutContainer.dataset.id;
        const targetWorkoutObj = this.#workouts.find((workoutObj) => workoutObj.creation.getTime() == targetWorkoutId);
        const targetWorkoutCoords = targetWorkoutObj.workoutCoords;
        this.#map.setView([targetWorkoutCoords.lat, targetWorkoutCoords.lng], this.#map.getZoom(), { animate: true, pan: { duration: 0.8 } });
    }

    _editWorkout(workout) {
        DOM_containerWorkouts.scrollTo(0, 0);
        this.#beingEditedId = workout.creation.getTime(); // activate edition mode
        DOM_form.classList.remove("hidden");
        DOM_editIconInForm.style.display = "initial";
        DOM_createIconInForm.style.display = "none";

        DOM_inputDistance.value = workout.distance;
        DOM_inputDuration.value = workout.duration;
        DOM_inputDate.valueAsNumber = workout.date;

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
        const targetWorkoutDOM = Array.from(DOM_containerWorkouts.querySelectorAll(".workout")).find((workoutDOM) => workoutDOM.dataset.id == workout.creation.getTime());
        workout.mapMarker.remove();
        targetWorkoutDOM.remove();
        this.#workouts.splice(targetWorkoutIndex, 1); // remove from DB

        if (workout.creation.getTime() == this.#beingEditedId) { // if user removes the workout that's being edited
            this.#beingEditedId = null;
            DOM_form.reset();
            DOM_form.classList.add("hidden");
            DOM_editIconInForm.style.display = "none";
            DOM_createIconInForm.style.display = "initial";
        }

        localStorage.setItem('workouts', JSON.stringify(this.#workouts, this.#stringifyReplacer));
    }

    _deleteAllWorkouts(e) {
        Array.from(DOM_containerWorkouts.querySelectorAll('li.workout')).forEach((workout) => {
            workout.remove();
        }); // remove everything from DOM
        this.#workouts.forEach((workout) => workout.mapMarker.remove()); // remove all markers

        this.#workouts = []; // remove from workouts array
        localStorage.setItem('workouts', JSON.stringify(this.#workouts, this.#stringifyReplacer));

        // reset UI elements
        this._resetForm();
        this._hideForm();
    }

    _openFilterPane(e) {
        DOM_filterPane.style.display = "unset";
        DOM_filterPaneArrow.style.display = "unset";
    }

    _hideFilterPane(e) {
        if (!e.target.closest(".filter-pane") && !e.target.closest(".filter-icon")) {
            DOM_filterPane.style.display = "none";
            DOM_filterPaneArrow.style.display = "none";
        }
    }

    _updateFilters(e) {
        if (!e.target.classList.contains("filter-pane__item")) return; // guard clause;
            
        if (e.target.classList.contains("filter-pane__item--active")) { // if click on already active filter, remove active class and remove tag from tagsArray
            e.target.classList.remove("filter-pane__item--active");
            const tag = e.target.getAttribute("class").split('---')[1];
            const index = this.#currentTagsArray.findIndex((tagInArray) => tagInArray === tag);
            this.#currentTagsArray.splice(index, 1);
        } else {
            // this block guarantees that there's only one filter active by category
            // e.target.closest("ul") will retrieve the container that represents the category to which the clicked filter belongs to
            Array.from(e.target.closest("ul").querySelectorAll(".filter-pane__item")).forEach((item) => {
                item.classList.remove("filter-pane__item--active");
                const tag = item.getAttribute("class").split('---')[1];
                const index = this.#currentTagsArray.findIndex((tagInArray) => tagInArray === tag);
                if (index !== -1) this.#currentTagsArray.splice(index, 1);
            });


            // since e.target was not active before, after making all other filters in that category inactive, make e.target active
            e.target.classList.add("filter-pane__item--active");
            this.#currentTagsArray.push(e.target.getAttribute("class").split('---')[1]);
        }

        // what if, while the workout is being sorted by a running-specific field, the user removes running from the filters?
        // the lines of code below try to take care of this
        const runningSpecificFiltersDOM = Array.from(document.querySelectorAll('.sort-pane__item--running'));
        const cyclingSpecificFiltersDOM = Array.from(document.querySelectorAll('.sort-pane__item--cycling'));

        if (!this.#currentTagsArray.includes("running") && runningSpecificFiltersDOM.some((item) => item.classList.contains("sort-pane__item--active"))) {
            const activeItem = runningSpecificFiltersDOM.find((item) => item.classList.contains("sort-pane__item--active"));
            activeItem.classList.remove("sort-pane__item--active");
            document.querySelector(".sort-pane__item--creation").classList.add("sort-pane__item--active");
            this.#currentSortingObj.field = "creation";
        }
        if (!this.#currentTagsArray.includes("cycling") && cyclingSpecificFiltersDOM.some((item) => item.classList.contains("sort-pane__item--active"))) {
            const activeItem = cyclingSpecificFiltersDOM.find((item) => item.classList.contains("sort-pane__item--active"));
            activeItem.classList.remove("sort-pane__item--active");
            document.querySelector(".sort-pane__item--creation").classList.add("sort-pane__item--active");
            this.#currentSortingObj.field = "creation";
        }

        this._renderWorkouts();
    }

    _openSortPane(e) {
        // the user can sort by running-specific fields ONLY IF "RUNNING" IS ONE OF THE FILTERS!
        // the user can sort by cycling-specific fields ONLY IF "CYCLING" IS ONE OF THE FILTERS!
        if (this.#currentTagsArray.includes("running")) {
            document.querySelectorAll('.sort-pane__item--running').forEach((item) => item.style.display = "unset");
            document.querySelectorAll('.sort-pane__item--cycling').forEach((item) => item.style.display = "none");
        } else if (this.#currentTagsArray.includes("cycling")) {
            document.querySelectorAll('.sort-pane__item--running').forEach((item) => item.style.display = "none");
            document.querySelectorAll('.sort-pane__item--cycling').forEach((item) => item.style.display = "unset");
        } else {
            document.querySelectorAll('.sort-pane__item--running').forEach((item) => item.style.display = "none");
            document.querySelectorAll('.sort-pane__item--cycling').forEach((item) => item.style.display = "none");
        }

        DOM_sortPane.style.display = "unset";
        DOM_sortPaneArrow.style.display = "unset";
    }

    _hideSortPane(e) {
        if (!e.target.closest(".filter-pane") && !e.target.closest(".sort-icon")) {
            DOM_sortPane.style.display = "none";
            DOM_sortPaneArrow.style.display = "none";
        }
    }

    _updateSorting(e) { // called when user interacts with the sorting options
        // update sorting obj
        if (!e.target.classList.contains("sort-pane__item") || e.target.classList.contains("sort-pane__item--active")) return; // guard clause;
        const categoryDiv = e.target.closest('.sort-pane__category');
        Array.from(e.target.parentNode.querySelectorAll('.sort-pane__item')).forEach((item) => item.classList.remove("sort-pane__item--active"));
        e.target.classList.add("sort-pane__item--active");
        if (categoryDiv.classList.contains('sort-pane__category--mode')) {
            this.#currentSortingObj.mode = e.target.textContent.split(' ')[1].toLowerCase();
        }
        if (categoryDiv.classList.contains('sort-pane__category--field')) {
            this.#currentSortingObj.field = e.target.textContent.split(' ')[1].toLowerCase();
        }
        
        // render them!
        this._renderWorkouts();
    }

    _getSortedWorkoutsArray(workoutsArr) {
        const sortedWorkouts = workoutsArr.toSorted((a, b) => a[this.#currentSortingObj.field] - b[this.#currentSortingObj.field]);
        if (this.#currentSortingObj.mode === "ascending") sortedWorkouts.reverse();
        return sortedWorkouts;
    }
}

const app = new App();