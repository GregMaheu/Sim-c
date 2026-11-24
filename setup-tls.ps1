$ErrorActionPreference = 'Stop'
$directory = Join-Path $PSScriptRoot '.tls'
$certPath = Join-Path $directory 'localhost.pem'
$keyPath = Join-Path $directory 'localhost-key.pem'
if ((Test-Path $certPath) -and (Test-Path $keyPath)) {
    Write-Output 'Local TLS files already exist.'
    return
}
$null = New-Item -ItemType Directory -Force -Path $directory
$rsa = [System.Security.Cryptography.RSA]::Create(2048)
try {
    $request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
        'CN=localhost', $rsa, [System.Security.Cryptography.HashAlgorithmName]::SHA256,
        [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $san = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
    $san.AddDnsName('localhost')
    $san.AddIpAddress([System.Net.IPAddress]::Loopback)
    $request.CertificateExtensions.Add($san.Build())
    $cert = $request.CreateSelfSigned([DateTimeOffset]::UtcNow.AddMinutes(-5), [DateTimeOffset]::UtcNow.AddDays(30))
    try {
        $key = $rsa.ExportPkcs8PrivateKey()
        $der = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
        foreach ($file in @(
            @{ Path = $certPath; Label = 'CERTIFICATE'; Bytes = $der },
            @{ Path = $keyPath; Label = 'PRIVATE KEY'; Bytes = $key }
        )) {
            $base64 = [Convert]::ToBase64String($file.Bytes, [Base64FormattingOptions]::InsertLineBreaks)
            [IO.File]::WriteAllText($file.Path, "-----BEGIN $($file.Label)-----`n$base64`n-----END $($file.Label)-----`n")
        }
    } finally { $cert.Dispose() }
} finally { $rsa.Dispose() }
Write-Output 'Created a 30-day self-signed certificate for localhost.'
