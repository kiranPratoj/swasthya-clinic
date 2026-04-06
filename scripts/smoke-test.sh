#!/bin/bash
BASE_URL="http://localhost:3000"

echo "Checking Home Page..."
curl -s "$BASE_URL/" | grep -q "Swasthya Clinic" && echo "✅ Home Page OK" || echo "❌ Home Page Failed"

echo "Checking Onboard Page..."
curl -s "$BASE_URL/onboard" | grep -q "Register Clinic" && echo "✅ Onboard Page OK" || echo "❌ Onboard Page Failed"

# On localhost, proxy.ts skips tenant resolution, so [slug]/admin will throw 
# "clinic_id not resolved" in the RSC payload if the middleware logic reached that point.
echo "Checking Admin Logic (via RSC error payload)..."
curl -s "$BASE_URL/test-clinic/admin" | grep -q "clinic_id not resolved" && echo "✅ Admin Logic (Tenant Check) OK" || echo "❌ Admin Logic Failed"
