$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:4003/api'
$tenantA = '86c372af-b374-41e3-8399-4c3b152ee0f6'
$tenantB = '00000000-0000-0000-0000-000000000001'

function Invoke-Api($method, $path, $tenant, $token, $body = $null) {
  $headers = @{ 'x-tenant-id' = $tenant }
  if ($token) { $headers.Authorization = "Bearer $token" }
  try {
    $params = @{ Uri = "$base$path"; Method = $method; Headers = $headers; UseBasicParsing = $true }
    if ($null -ne $body) {
      $params.ContentType = 'application/json'
      $params.Body = ($body | ConvertTo-Json -Depth 8)
    }
    $response = Invoke-WebRequest @params
    return [PSCustomObject]@{ status = [int]$response.StatusCode; json = if ($response.Content) { $response.Content | ConvertFrom-Json } else { $null } }
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $content = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { '' }
    return [PSCustomObject]@{ status = $status; json = if ($content) { try { $content | ConvertFrom-Json } catch { $null } } else { $null } }
  }
}

function Login($path, $email, $password, $tenant) {
  $r = Invoke-Api 'POST' $path $tenant $null @{ email = $email; password = $password }
  return [PSCustomObject]@{ status = $r.status; token = $r.json.accessToken; user = $r.json.user; tenantId = $r.json.tenantId }
}

$admin = Login '/auth/login' $env:VALIDATION_ADMIN_EMAIL $env:VALIDATION_ADMIN_PASSWORD 'dnacare-sandbox'
$rep = Login '/auth/login' $env:VALIDATION_REP_EMAIL $env:VALIDATION_REP_PASSWORD 'dnacare-sandbox'
$super = Login '/auth/admin/login' $env:VALIDATION_SUPER_EMAIL $env:VALIDATION_SUPER_PASSWORD 'default'
$results = [System.Collections.Generic.List[object]]::new()
function Add-Result($id, $actual, $expected, $detail) { $results.Add([PSCustomObject]@{ id = $id; status = if ($actual -eq $expected) { 'PASSOU' } else { 'FALHOU' }; http = $actual; expected = $expected; detail = $detail }) }

Add-Result 'AUTH-01' ($super.status) 201 'super admin login';
$global = Invoke-Api 'GET' '/tenants' 'default' $super.token
Add-Result 'AUTH-02' $global.status 200 'super admin global administration';
$own = Invoke-Api 'GET' '/opportunities' 'dnacare-sandbox' $admin.token
Add-Result 'AUTH-03' $own.status 200 'admin own tenant resource';
$repAdminAction = Invoke-Api 'GET' '/tenants' 'dnacare-sandbox' $rep.token
Add-Result 'AUTH-04' $repAdminAction.status 403 'representative administrative action';
$crossTenant = Invoke-Api 'GET' '/opportunities' 'default' $rep.token
Add-Result 'AUTH-05' $crossTenant.status 403 'tenant A token against tenant B';

$users = Invoke-Api 'GET' '/users' 'default' $super.token
$secretsResponse = ($users.json | ConvertTo-Json -Depth 20)
$secretFieldsFound = @('password','asaasApiKey','asaasWebhookAuthToken') | Where-Object { $secretsResponse -match ('"' + $_ + '"') }
Add-Result 'AUTH-08' ([int]($secretFieldsFound.Count -eq 0)) 1 "GET /users secret fields absent=$($secretFieldsFound.Count -eq 0)";
$clientList = Invoke-Api 'GET' '/clients' 'dnacare-sandbox' $admin.token
$clientId = @($clientList.json.data | Select-Object -First 1).id
foreach ($field in @('tenantId','status','asaasCustomerId','holderId','relationships')) {
  $sensitive = @{}; $sensitive[$field] = 'forbidden-test'
  $r = Invoke-Api 'PATCH' "/clients/$clientId" 'dnacare-sandbox' $admin.token $sensitive
  Add-Result "AUTH-09-$field" $r.status 400 "sensitive field rejected: $field";
}

$output = $results | ConvertTo-Json -Depth 8
$output | Set-Content (Join-Path $PSScriptRoot 'auth-multitenancy-results.json') -Encoding utf8
$output
