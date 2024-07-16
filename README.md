# Mapty - Map Your Workouts!

Mapty is a fictional web-application that allows users to store and map their workouts (running or cycling) through an interactive map, where the workouts are nicely displayed. When the user clicks anywhere on the map, a form shows up, where they can fill out some details about the activity, like distance, pace, duration, date, etc. All the additions, deletions and modifications made by the user are saved locally in the browser, so refreshing the page won't cause any data loss. Take a look at it [LIVE](https://oczywsziysya-mapty.netlify.app)!.

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
https://github.com/user-attachments/assets/8f812a3e-e45e-4a49-a69f-dbee5b5f2122

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

### My modifications

I added some modifications and features to the project as well:

- Originally, the workout date was the same as the date the workout was created on the app ([see DEMO](https://mapty.netlify.app)), which doesn't make much sense to me. I figured that a user has to be able to add past and future workouts, so I added an **additional field for workout date**. In my version, the creation date is used only as an unique identifier for a given workout, and also as a basis of comparison, since **past workouts have markers with lower opacity on the map**.
- Now the **workouts can be edited and deleted**.

## Pending features

- [x] Fix the problem with `JSON.stringify()` that was described previously, and then finally add a functional and useful local storage for storing workout data in the browser.
- [ ] Add filters for the workout list, so that the user can filter by type of activty (running or cycling) and see only past or only future workouts.
- [ ] Add a sorting feature that will allow the user to sort by field (distance, duration, speed/pace, etc.) in ascending or descending order.
- [ ] Make the application responsive and mobile-friendly.
