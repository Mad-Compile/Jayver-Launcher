use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Deserialize)]
struct MojangIdentity {
    id: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct SessionProfile {
    properties: Option<Vec<SessionProperty>>,
}

#[derive(Debug, Deserialize)]
struct SessionProperty {
    name: String,
    value: String,
}

#[derive(Debug, Deserialize)]
struct TexturePayload {
    textures: Option<TextureSet>,
}

#[derive(Debug, Deserialize)]
struct TextureSet {
    #[serde(rename = "SKIN")]
    skin: Option<SkinTexture>,
}

#[derive(Debug, Deserialize)]
struct SkinTexture {
    url: Option<String>,
    metadata: Option<SkinMetadata>,
}

#[derive(Debug, Deserialize)]
struct SkinMetadata {
    model: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftPublicProfile {
    pub name: String,
    pub uuid: String,
    pub skin: Option<String>,
    pub model: String,
}

fn dashed_uuid(raw: &str) -> Option<String> {
    let clean = raw.replace('-', "");
    if clean.len() != 32 || !clean.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return None;
    }
    Some(format!(
        "{}-{}-{}-{}-{}",
        &clean[0..8],
        &clean[8..12],
        &clean[12..16],
        &clean[16..20],
        &clean[20..32]
    ))
}

async fn request_identity(client: &Client, username: &str) -> Result<MojangIdentity, String> {
    let primary_url = format!(
        "https://api.mojang.com/users/profiles/minecraft/{username}"
    );
    let primary = client
        .get(primary_url)
        .send()
        .await
        .map_err(|_| "Minecraft profile service could not be reached.".to_string())?;

    if primary.status() == StatusCode::TOO_MANY_REQUESTS {
        return Err("Minecraft profile lookup is rate limited. Try again in a little while.".into());
    }

    if primary.status().is_success() {
        if primary.status() == StatusCode::NO_CONTENT {
            return Err("No Java Edition profile was found for that name.".into());
        }
        if let Ok(identity) = primary.json::<MojangIdentity>().await {
            return Ok(identity);
        }
    }

    // Mojang's legacy host can intermittently return 403. Minecraft Services
    // exposes the equivalent public name lookup as a fallback.
    let fallback_url = format!(
        "https://api.minecraftservices.com/minecraft/profile/lookup/name/{username}"
    );
    let fallback = client
        .get(fallback_url)
        .send()
        .await
        .map_err(|_| "Minecraft profile service could not be reached.".to_string())?;

    if fallback.status() == StatusCode::TOO_MANY_REQUESTS {
        return Err("Minecraft profile lookup is rate limited. Try again in a little while.".into());
    }
    if fallback.status() == StatusCode::NO_CONTENT || fallback.status() == StatusCode::NOT_FOUND {
        return Err("No Java Edition profile was found for that name.".into());
    }
    if !fallback.status().is_success() {
        return Err("Minecraft profile lookup is temporarily unavailable.".into());
    }

    fallback
        .json::<MojangIdentity>()
        .await
        .map_err(|_| "Minecraft returned an invalid profile response.".to_string())
}

async fn fetch_skin(client: &Client, uuid: &str) -> (Option<String>, String) {
    let url = format!(
        "https://sessionserver.mojang.com/session/minecraft/profile/{}",
        uuid.replace('-', "")
    );
    let response = match client.get(url).send().await {
        Ok(response) if response.status().is_success() => response,
        _ => return (None, "classic".into()),
    };
    let profile = match response.json::<SessionProfile>().await {
        Ok(profile) => profile,
        Err(_) => return (None, "classic".into()),
    };
    let encoded = match profile
        .properties
        .and_then(|properties| properties.into_iter().find(|property| property.name == "textures"))
        .map(|property| property.value)
    {
        Some(value) => value,
        None => return (None, "classic".into()),
    };
    let decoded = match BASE64.decode(encoded) {
        Ok(decoded) => decoded,
        Err(_) => return (None, "classic".into()),
    };
    let textures = match serde_json::from_slice::<TexturePayload>(&decoded) {
        Ok(textures) => textures,
        Err(_) => return (None, "classic".into()),
    };
    let skin = textures.textures.and_then(|textures| textures.skin);
    let skin_url = skin
        .as_ref()
        .and_then(|skin| skin.url.as_deref())
        .filter(|url| url.starts_with("https://textures.minecraft.net/"))
        .map(str::to_string);
    let model = if skin
        .and_then(|skin| skin.metadata)
        .and_then(|metadata| metadata.model)
        .as_deref()
        == Some("slim")
    {
        "slim"
    } else {
        "classic"
    };
    (skin_url, model.into())
}

#[tauri::command]
pub async fn lookup_minecraft_profile(username: String) -> Result<MinecraftPublicProfile, String> {
    let username = username.trim();
    if !(3..=16).contains(&username.len())
        || !username.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
    {
        return Err("Enter a valid Java Edition username (3–16 letters, numbers or underscores).".into());
    }

    let client = Client::builder()
        .user_agent(concat!("JayverLauncher/", env!("CARGO_PKG_VERSION")))
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|_| "Could not initialize Minecraft profile lookup.".to_string())?;

    let identity = request_identity(&client, username).await?;
    let uuid = dashed_uuid(&identity.id)
        .ok_or_else(|| "Minecraft returned an invalid profile ID.".to_string())?;
    let (skin, model) = fetch_skin(&client, &identity.id).await;

    Ok(MinecraftPublicProfile {
        name: identity.name,
        uuid,
        skin,
        model,
    })
}

#[cfg(test)]
mod tests {
    use super::dashed_uuid;

    #[test]
    fn formats_a_valid_mojang_uuid() {
        assert_eq!(
            dashed_uuid("853c80ef3c3749fdaa49938b674adae6").as_deref(),
            Some("853c80ef-3c37-49fd-aa49-938b674adae6")
        );
    }

    #[test]
    fn rejects_invalid_uuid_values() {
        assert!(dashed_uuid("not-a-uuid").is_none());
    }
}
