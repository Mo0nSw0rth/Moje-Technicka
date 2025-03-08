import asyncio
import time

import httpx
from datetime import datetime, timedelta
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import schedule


def mailSend(mail, vin):
    smtp_server = "smtp.eu.mailgun.org"
    smtp_port = 587
    username = "noreply@moondev.eu"
    password = "password"

    from_addr = "noreply@moondev.eu"
    to_addr = mail
    subject = "Došel ti technický průkaz"

    body = f"""
    <html>
    <body>
        <p>Dobrý den,</p>
        <p>Končí vám technická kontrola u auta s VIN: <strong>{vin}</strong></p>
    </body>
    </html>
    """

    msg = MIMEMultipart()
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(username, password)
        server.sendmail(from_addr, to_addr, msg.as_string())
        server.quit()
        print("E-mail úspěšně odeslán!")
    except Exception as e:
        print(f"Chyba při odesílání e-mailu: {e}")
#
async def getCars():
    url = f"http://localhost:8000/getCars"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

async def getNextDates(vin: str):
    url = f"http://localhost:8000/getByVinPublic/{vin}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

async def getUserId(vin: str):
    url = f"http://localhost:8000/getUserID/{vin}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

async def getMail(userID: int):
    url = f"http://localhost:8000/getUserMail/{userID}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()


def CheckAndSendEmails():
    data = asyncio.run(getCars())
    cars_vins = [car["vehicle_vin"] for car in data]
    #print(cars_vins)

    for i in cars_vins:
        vin_data = asyncio.run(getNextDates(i))
        #print(vin_data[0]["next_inspection_date"])

        datum_string = vin_data[-1]["next_inspection_date"]
        datum = datetime.strptime(datum_string, "%Y-%m-%d").date()
        dnes = datetime.today().date()
        rozdil = (datum - dnes).days
        if rozdil == 445:
            print("Podmínka splněna: zbývá přesně 30 dní.", "Zaznam pro vin: ",i)
            dalsi_data = asyncio.run(getUserId(i))
            #print(dalsi_data)
            user_id = dalsi_data[0]['user_id']
            user_mail_json = asyncio.run(getMail(user_id))
            #print(user_mail)
            user_mail = user_mail_json[0]['username']
            mailSend(user_mail,i)
        else:
            print(f"Podmínka nesplněna: zbývá {rozdil} dní.", "Zaznam pro vin: ",i)


schedule.every().day.at("08:30").do(CheckAndSendEmails)
while True:
    schedule.run_pending()
    time.sleep(60)