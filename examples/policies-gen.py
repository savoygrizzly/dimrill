import random
import json
import sys

def create_malicious_policy():
    # Zero-width characters
    zero_width_space = "\u200B"
    zero_width_nonjoiner = "\u200C"

    # Regular policy structure with hidden payload
    policy = f"files:{zero_width_space}*{zero_width_nonjoiner}:orders:createOrder&pricelist/distributor"
    return policy

def create_random_policy():
    actions = ["files", "documents", "images", "videos"]
    operations = ["create", "edit", "delete", "view"]
    params = ["user", "role", "department", "location"]
    values = ["admin", "editor", "viewer", "public"]

    action = random.choice(actions)
    operation = random.choice(operations)
    path = f"{action}:{operation}"

    policy_parts = [path]
    for _ in range(random.randint(0, 3)):  # 0 to 3 additional parameters
        if random.random() < 0.1:  # 10% chance to introduce a problem
            # Introduce either a &* or malformed parameters
            if random.random() > 0.5:
                policy_parts.append("&*")
            else:
                policy_parts.append(random.choice(params))  # Malformed (no value)
        else:
            param = random.choice(params)
            value = random.choice(values) if random.random() > 0.3 else "*"  # 30% chance of wildcard
            policy_parts.append(f"{param}/{value}")

    return '&'.join(policy_parts)

generate_few = len(sys.argv) > 1 and sys.argv[1] == "few"

# Number of policies to generate
num_policies = 100 if generate_few else 10000

# Generate policies
policies = [create_malicious_policy() if random.random() < 0.1 else create_random_policy() for _ in range(num_policies)]

# Save to a JSON file
file_name = 'fake_policies.json'
with open(file_name, 'w') as file:
    json.dump(policies, file, indent=4)

len(policies), policies[:5], file_name  # Output length, first 5 policies for preview, and file name