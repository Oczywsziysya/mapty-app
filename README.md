# Mapty - Map Your Workouts!

Mapty is a fictional web-application that allows users to store and map their workouts (running or cycling) through an interactive map, where the workouts are nicely displayed. When the user clicks anywhere on the map, a form shows up, where they can fill out some details about the activity, like distance, pace, duration, date, etc. All the additions, deletions and modifications made by the user are saved locally in the browser, so refreshing the page won't cause any data loss. Besides, the user can edit, delete, filter and sort their workouts! Take a look at it [LIVE](https://oczywsziysya-mapty.netlify.app)!.

## Table of contents

- [Overview](#overview)
    - [Screenshots & Videos](#screenshots--videos)
        - [Desktop](#desktop)
- [My experience](#my-experience)
    - [My modifications](#my-modifications)
- [Pending features](#pending-features)

## Overview

This is a project from the Jonas Schmedtmann's JS course that is mainly intended for practicing previously learned OOP concepts. You can check the official DEMO version [here](https://mapty.netlify.app). Besides the core functionality, my version features a couple of new things (more details further).

### Screenshots & Videos

#### Desktop
https://github.com/user-attachments/assets/b3fe4883-bec8-467b-befb-92dba31c8438

## My experience

This is my first OOP project and I'm starting to really like the idea of it. At first I implemented all the functionality the way I used to do it before (without following any kind of design pattern at all), and even though it worked as intended, I felt like the code was messy, difficult to modify as the need for new functionalities rose and also unpredictable, in despite of my efforts to make it clean and modular. I used classes for the workouts (Workout class, with RunningWorkout and CyclingWorkout extending the Workout class), but nicely packing the whole application to an App class didn't come to mind at all until the tutor (Jonas Schmedtmann) mentioned it, and it was really a game changer! Really excited and looking forward to applying the same concepts to other projects in the future. The Mapty project was amazing and I definitely learned a ton from it. The things I learned and the skills I sharpened:

- What is the Geolocation API and how to use it to locate a user's position (if they so desire, of course).
- Using the open-source library [Leaflet](https://leafletjs.com/index.html) to embed an interactive, mobile-friendly and customizable map into a web page. I learned how to modify the tiles, to style markers and add them to the map, to style popups and bind them to a marker or to the map itself, to handle events that happen on the map and to deal with the event objects that are automatically passed to such handlers. Needless to say that having patience and taking some time to read and learn from the documentation is a very valuable skill by itself.
- Great practice on using the `this` keyword and the `bind` method. I've read a couple of articles and watched a couple of videos about it in the last few weeks, but until this very moment I had never fully realized how important it actually is, probably because that's my first OOP project. I still find it tricky and it takes me some time to think about it, but things are much more clear than before.
- Planning the application: creating user stories to describe the application's functionality from an user's perspective in order to understand what features have to be implemented, using this information to design a nice flowchart that visually summarizes how the application works and thinking of an architecture to give the code a clean and maintainable structure.
- The 4 pillars of OOP: Abstraction, Encapsulation, Inheritance and Polymorphism.
- Prototypal inheritance, the 3 main ways of implementing it (constructor functions, `Object.create()`, ES6 classes) and how it differs from classical inheritance.
- Object getters and setters and their main cases of usage, like data validation.
- The HTML input type `select` and how to handle it with the `change` JS event.
- The HTML input type `datetime-local` for date input through a calendar.
- More practice on bubbling/event delegation (used it to move to a certain workout on the map when the user clicks on that workout in the list).
- Using the localStorage API to store data in the user's browser, so that modifications made by the user can be remembered locally. Even though I did learn about the localStorage, it's not being used here because I ran into some problems with circular references (which would result in strings of infinite length) when trying to stringify the workouts array with `JSON.stringify()`. Also, the stringified object won't have getters/setters/methods/prototype chain, and my current implementation relies on these very heavily. I could try to rebuild the flattened objects that are retrieved from the local storage using the classes I wrote, that is, to use the local storage only as a way to get the "fundamental" pieces of data and all the rest can be derived from these fundamental pieces by rebuilding the crippled objects.
**(07/16/2024, 4:55 PM)** The problem is now solved, it worked. Besides building the objects again (since the stringified ones are flattened and damaged, lots of data loss), I used a replacer function with `JSON.stringify()` to ignore the properties that store the marker and the popup of the workout. The circular references come from these, I didn't write them myself, they are just necessary for Leaflet internal work. Ignoring these properties doesn't break anything, because the marker and the popup properties are not "fundamental pieces of data", that is, they can be restored by rebuilding the objects just fine.
- DOM traversing.
- `z-index`, `isolate` and stacking contexts in CSS. When creating the filtering and sorting panes (which are absolutely positioned in relation to the according icons), I had a really hard time with stacking contexts, the way elements would be rendered just didn't make any sense to me, so I had to do a little bit of research on the topic and the things I learned were rather surprising. In terms of `z-index`, two elements can only be compared if they are in the same stacking context, and there are **a lot** of things that create stacking contexts for all descendants of a certain element, like `transform`, setting `opacity` to a value lower than 0, and many many more! An element cannot escape from its parent's stacking context, no matter what. When an element is given a position that is different than `position: static` and a z-index that is different than `z-index: auto`, it'll have 2 effects: it specifies the stack level of the box **in the stacking context it belongs to** and **creates a new stacking context** for its children! And all this made the whole situation a lot clearer. At first I intuitively thought that there's only one "global stacking context", to which all boxes belong, and setting the `z-index` would specify the stack level of a certain box in this global context. The `isolation: isolate` declaration comes in handy when we want an element to create its own stacking context, but without modifying its `z-index`. 

### My modifications

I added some modifications and features to the project as well:

- Originally, the workout date was the same as the date the workout was created on the app ([see DEMO](https://mapty.netlify.app)), which doesn't make much sense to me. I figured that a user has to be able to add past and future workouts, so I added an **additional field for workout date**. In my version, the creation date is used only as an unique identifier for a given workout, and also as a basis of comparison, since **past workouts have markers with lower opacity on the map**.
- The user can now filter the workouts by some tags (running or cycling, past/future/today workouts, etc). There are filter categories and each category can have only one active filter, since some tags exclude each other (a workout can't have both running and cycling types, and can't be both past and future). The filters affect not only the workout list, but also the markers! If a certain marker is attached to a workout that doesn't satisfy the filters, it won't be rendered on the map. If workouts are created or edited while the filter is active, it will remain active.
- The user can now sort the workouts by field (e.g. distance, duration, date, pace, elevation gain, etc.) and mode (ascending or descending). Some sorting fields are specific to a certain type of activity and whether they will or not be displayed on the sort pane depends on the filter options. For instance, if "running" is one of the filters, then the running specific fields will be available for sorting, otherwise they won't be there. If workouts are created or edited while some sorting criteria is active, it will remain active. For now, sorting by more than one field is not supported.
- Now the **workouts can be edited and deleted** from the UI and from the database / local storage.

## Pending features

- [x] Fix the problem with `JSON.stringify()` that was described previously, and then finally add a functional and useful local storage for storing workout data in the browser.
- [x] Add filters for the workout list, so that the user can filter by type of activity (running or cycling) and see only past or only future workouts.
- [x] Add a sorting feature that will allow the user to sort by field (distance, duration, speed/pace, etc.) in ascending or descending order.
- [ ] Make the application responsive and mobile-friendly.
