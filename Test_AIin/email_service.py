import smtplib
from email.message import EmailMessage
import os 

def send_invite(to_email, interview_link):
    mesg=EmailMessage()
    mesg["subject"] = "AI Interview Invitation"
    mesg["from"] = os.getenv("EMAIL_ADDRESS")
    mesg["to"] = to_email
    mesg.set_content(f"""
                     Hello,
                     you have been invited to an AI-powered interview.
                     Please join using the following link: {interview_link}""")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(os.getenv("EMAIL_ADDRESS"), os.getenv("EMAIL_PASSWORD"))
        smtp.send_message(mesg)
    print(f"Invitation sent to {to_email}")