# RoomHelper 3000

A webapp to manage a class of students in a computer lab.

- shows where the students are sitting (from the teacher’s and the students’ perspective)
- lets the students indicate they need help, are done with the current task, or have an answer to the question being asked
- randomly chooses students from the entire class, or from just those who have indicated they have an answer
- shows the students the current task, or other message from the teacher
- gives realtime polls
    - short text
    - multiple choice
    - from 0 to 10
- allows the students to chat with each other (when the teacher permits it)
- allows sharing by students of links to approved domains
- provides a bell that rings on all the computers
- allows the teacher to pre-load poll questions

## Improvement ideas

- Log in with Google
    - Here’s a guide: https://fosstack.com/how-to-add-google-authentication-in-django/ . Is this a good way?
- Chat:
    - Delete all messages from a person
    - Disable chat for a person
- Make it easier to help students in order of them checking the box. Maybe a special marking for whoever is next. Perhaps this:
    - An assistant page that is like the teacher page, but with less
    power, and focused on helping kids in the order requested
- Let the students pick their location by clicking on the seating
chart instead of by row and column
- Show poll results graphically à la Google forms
- Use HTML and CSS to draw the stations rather than p5.js
- Color code the station boxes to praise or warn students
- Allow teachers to configure without having to change settings.py
  - Seat layout
  - Class periods 

![Screen shot](screen1-large.png)

## Running
`flask run --host='0.0.0.0'`

## Creating the js files
use build from the run menu in IntelliJ IDEA
