import requests

url = "http://localhost:5000/generate"
json_data = {
    "prompt": ["Hello, how are you?"],
    "max_new_tokens": 200,
    "temperature": 0.5, 
    "top_p": 0.95
}
headers = {
    "X-API-Key": ""
}
response = requests.post(url, json=json_data, headers=headers)
print(response.json())