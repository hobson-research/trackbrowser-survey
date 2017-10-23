# trackbrowser-survey
Server application to generate survey questions and collect responses

## Running server program
Program is written in `nodejs`, with MongoDB and express as a webserver. It requires `nodejs` version to be higher than 7.x to use `async/await` features of Javascript. 

Install npm packages

`$ npm install`

Configure screenshot directories and participant usernames in config file

`$ vim config/default.json`

Run a script to pre-process database navigation entries


`$ node clone-trackbrowser-db.js`

Run server application

`$ noe main.js`


### Pre-processing MongoDB collection and screenshots



## Questionnaires

**QUESTION 1**

What kind of webpage is this?
- Search Engine (e.g., Google)
- Data Aggregator (e.g., Yahoo Finance, Google Finance)
- A Company's Investor Relations Page
- Corporate Filings With The SEC (e.g., finding or reading 10-K, 10-Q, 8-K, etc.)
- News Article About a Company
- Investment Blog
- Other _______________________
- Irrelevant (e.g., checking mail, checking Facebook, etc.)

**QUESTION 2**
- Open-ended
- How would you characterize the research being done?

**QUESTION 3**
- What company is being researched?

