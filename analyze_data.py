import pandas as pd
from sklearn.tree import DecisionTreeClassifier

# --- Data Loading and Reshaping ---

# Load the JSON file you just created
df = pd.read_json('sensor_data.json')

# Normalize the data and convert timestamp
data = [item['fields'] for item in df.to_dict('records')]
df_processed = pd.DataFrame(data)
df_processed['timestamp'] = pd.to_datetime(df_processed['timestamp'])

# Group the data by the minute and then pivot it
df_wide = df_processed.pivot_table(
    index=pd.Grouper(key='timestamp', freq='min'),
    columns='reading_type',
    values='reading_value',
    aggfunc='mean'
).reset_index()

# Fill any missing values with 0
df_wide = df_wide.fillna(0)

# --- Introduce Failure Data ---

# Manually add a clear failure case to the DataFrame
failure_case = pd.DataFrame({
    'timestamp': [pd.Timestamp('2025-08-03 12:30:00+00:00')],
    'current': [10.5],
    'temperature': [40.2],
    'vibration': [2.1],
    'voltage': [220.0]
})
df_wide = pd.concat([df_wide, failure_case], ignore_index=True)

# Create a simple fake target variable for "failure"
df_wide['failure'] = (df_wide['temperature'] > 35).astype(int)

# --- Machine Learning Model ---

# Separate features (X) and target (y)
X = df_wide.drop(['timestamp', 'failure'], axis=1)
y = df_wide['failure']

# Create and train the model on the full dataset
model = DecisionTreeClassifier()
model.fit(X, y)

# Make a sample prediction on new data that should be a failure
new_data_point = pd.DataFrame([[2.8, 36.0, 0.45, 220.0]], columns=X.columns)
prediction = model.predict(new_data_point)
print(f"Prediction for new data (current: 2.8, temp: 36.0): {'Failure' if prediction[0] == 1 else 'Normal'}")