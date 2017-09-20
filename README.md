# trackbrowser-survey
Server application to generate survey questions and collect responses

## Running server program
Program is written in Python, with PyMongo for interacting with MongoDB and flask as a webserver. It is preferrable to run the app in a virtual environment. `virtualenv` is used in deployment. 

Install `virtualenv`

`$ pip install virtualenv`

Install requirements

`$ pip3 install -r requirements.txt`

Run server application

`$ python index.py`


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

