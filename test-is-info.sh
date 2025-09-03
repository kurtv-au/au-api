#!/bin/bash

# Test script for /api/is/info endpoint
# Usage: 
#   ./test-is-info.sh -n <client-number> <api-key>  # Search by client number
#   ./test-is-info.sh -c <client-name> <api-key>    # Search by client name
#   ./test-is-info.sh -t <api-key>                  # Run all tests

API_KEY=${API_KEY:-"your-api-key-here"}
BASE_URL="http://localhost:3000"

function test_by_number() {
  local client_number=$1
  echo "Testing by Client Number: $client_number"
  echo "------------------------------"
  
  curl -X GET \
    "${BASE_URL}/api/is/info?clientNumber=${client_number}" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -s | python3 -m json.tool 2>/dev/null || echo "Error: Failed to get response"
  
  echo ""
}

function test_by_name() {
  local client_name=$1
  echo "Testing by Client Name (partial): '$client_name'"
  echo "------------------------------"
  
  # URL encode the client name
  local encoded_name=$(echo -n "$client_name" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))")
  
  curl -X GET \
    "${BASE_URL}/api/is/info?clientName=${encoded_name}" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -s | python3 -m json.tool 2>/dev/null || echo "Error: Failed to get response"
  
  echo ""
}

function test_xor_validation() {
  echo "Testing XOR Validation"
  echo "------------------------------"
  
  echo "1. Testing with BOTH parameters (should fail):"
  curl -X GET \
    "${BASE_URL}/api/is/info?clientNumber=12345&clientName=Test" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -s | python3 -m json.tool 2>/dev/null || echo "Error response received (expected)"
  
  echo ""
  echo "2. Testing with NO parameters (should fail):"
  curl -X GET \
    "${BASE_URL}/api/is/info" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -s | python3 -m json.tool 2>/dev/null || echo "Error response received (expected)"
  
  echo ""
}

# Parse command line arguments
case "$1" in
  -n|--number)
    API_KEY=${3:-$API_KEY}
    test_by_number "$2"
    ;;
  -c|--name)
    API_KEY=${3:-$API_KEY}
    test_by_name "$2"
    ;;
  -t|--test-all)
    API_KEY=${2:-$API_KEY}
    echo "Running All Tests"
    echo "=============================="
    echo ""
    
    test_by_number "12345"
    test_by_name "Test"
    test_by_name "Answer"
    test_xor_validation
    
    echo "=============================="
    echo "All tests complete"
    ;;
  *)
    echo "Usage:"
    echo "  $0 -n <client-number> [api-key]  # Search by client number"
    echo "  $0 -c <client-name> [api-key]    # Search by client name (partial match)"
    echo "  $0 -t [api-key]                  # Run all tests including XOR validation"
    echo ""
    echo "Example:"
    echo "  $0 -n 12345 your-api-key"
    echo "  $0 -c 'Answer United' your-api-key"
    echo "  $0 -t your-api-key"
    exit 1
    ;;
esac