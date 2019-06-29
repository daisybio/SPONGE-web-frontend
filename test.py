from flask import make_response, abort
from config import db
from models import Person, PersonSchema, Note
import random
import json

def random_int():
    """
    This function responds to a request for /api/test
    with a random number

    """
    dictionary = dict()
    dictionary['value'] = random.randint(0, 100)
    data = json.dumps(dictionary)
    print(data)
    return data
    