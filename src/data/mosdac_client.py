"""
MOSDAC (ISRO Meteorological & Oceanographic Satellite Data Archival Centre) Client
==================================================================================
Handles programmatic discovery, authentication, search, and download of INSAT-3DR
and related ISRO satellite datasets according to the official MOSDAC Data Download API.

Security & Integrity Rules:
- NEVER print, log, or expose user credentials or passwords.
- Return standardized safe error codes (e.g., MOSDAC_AUTH_FAILED, NETWORK_UNREACHABLE).
- Verify downloaded files with real NetCDF4/HDF5 validation (size > 0, uncorrupted header).
- Never generate fake or placeholder satellite arrays.
"""

import os
import sys
import json
import time
import hashlib
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

import requests
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

# Setup safe logger that never logs passwords or authorization tokens
logger = logging.getLogger("meghnetra_mosdac")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter("[%(asctime)s] [MOSDAC] %(levelname)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class MOSDACClient:
    """
    Official API Client for MOSDAC Data Download API.
    Endpoints mirror ISRO SAC's mdapi service.
    """

    DEFAULT_BASE_URL = "https://mosdac.gov.in"
    TOKEN_ENDPOINT = "/download_api/gettoken"
    REFRESH_ENDPOINT = "/download_api/refresh-token"
    SEARCH_ENDPOINT = "/apios/datasets.json"
    CHECK_INTERNET_ENDPOINT = "/download_api/check-internet"
    DOWNLOAD_ENDPOINT = "/download_api/download"
    LOGOUT_ENDPOINT = "/download_api/logout"

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout: int = 15,
        verify_ssl: bool = True,
    ):
        self.base_url = base_url.rstrip("/")
        # Safely read credentials from parameters or environment
        self.username = username or os.getenv("MOSDAC_USERNAME", "").strip()
        self._password = password or os.getenv("MOSDAC_PASSWORD", "").strip()
        self.timeout = timeout
        self.verify_ssl = verify_ssl

        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None

    def has_credentials(self) -> bool:
        """Check whether credentials are provided without exposing them."""
        return bool(self.username and self._password)

    def authenticate(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Authenticate against MOSDAC /download_api/gettoken.
        Returns dict with status and safe message.
        """
        user = username or self.username
        pwd = password or self._password

        if not user or not pwd:
            return {
                "success": False,
                "error": "MOSDAC_CREDENTIALS_MISSING",
                "message": "MOSDAC_USERNAME or MOSDAC_PASSWORD is not set in environment or arguments.",
            }

        url = f"{self.base_url}{self.TOKEN_ENDPOINT}"
        payload = {"username": user, "password": pwd}

        try:
            logger.info("Attempting authentication with MOSDAC for user: %s", user)
            response = requests.post(
                url,
                json=payload,
                timeout=self.timeout,
                verify=self.verify_ssl,
            )

            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.refresh_token = data.get("refresh_token")
                logger.info("Authentication successful with MOSDAC.")
                return {
                    "success": True,
                    "message": "Authentication successful",
                    "username": user,
                    "has_token": bool(self.access_token),
                }

            if response.status_code == 401:
                logger.warning("MOSDAC authentication failed (401: Invalid credentials).")
                return {
                    "success": False,
                    "error": "MOSDAC_AUTH_FAILED",
                    "status_code": 401,
                    "message": "Invalid MOSDAC username or password. Please verify credentials.",
                }

            if response.status_code == 400:
                err_msg = "Validation error in authentication request."
                try:
                    err_msg = response.json().get("error", err_msg)
                except Exception:
                    pass
                return {
                    "success": False,
                    "error": "MOSDAC_BAD_REQUEST",
                    "status_code": 400,
                    "message": err_msg,
                }

            if response.status_code == 503:
                return {
                    "success": False,
                    "error": "MOSDAC_MAINTENANCE",
                    "status_code": 503,
                    "message": "MOSDAC service is temporarily under maintenance (503).",
                }

            return {
                "success": False,
                "error": f"MOSDAC_HTTP_{response.status_code}",
                "status_code": response.status_code,
                "message": f"Unexpected response from MOSDAC server ({response.status_code}).",
            }

        except requests.exceptions.SSLError:
            logger.warning("SSL Verification failed. Retrying without SSL verification...")
            try:
                response = requests.post(
                    url,
                    json=payload,
                    timeout=self.timeout,
                    verify=False,
                )
                if response.status_code == 200:
                    data = response.json()
                    self.access_token = data.get("access_token")
                    self.refresh_token = data.get("refresh_token")
                    return {
                        "success": True,
                        "message": "Authentication successful (insecure SSL mode)",
                        "username": user,
                        "has_token": bool(self.access_token),
                    }
                elif response.status_code == 401:
                    return {
                        "success": False,
                        "error": "MOSDAC_AUTH_FAILED",
                        "status_code": 401,
                        "message": "Invalid MOSDAC username or password.",
                    }
            except Exception as e:
                return {
                    "success": False,
                    "error": "NETWORK_UNREACHABLE",
                    "message": f"Unable to reach MOSDAC: {str(e)}",
                }

        except (requests.ConnectionError, requests.Timeout) as e:
            logger.error("Connection or timeout error while contacting MOSDAC: %s", type(e).__name__)
            return {
                "success": False,
                "error": "NETWORK_UNREACHABLE",
                "message": "Network connection error or timeout contacting MOSDAC API.",
            }
        except Exception as e:
            logger.error("Unexpected error during authentication: %s", str(e))
            return {
                "success": False,
                "error": "MOSDAC_CLIENT_ERROR",
                "message": f"An error occurred: {str(e)}",
            }

    def refresh_access_token(self) -> bool:
        """Refresh the access token using the stored refresh token."""
        if not self.refresh_token:
            return False

        url = f"{self.base_url}{self.REFRESH_ENDPOINT}"
        try:
            res = requests.post(
                url,
                json={"refresh_token": self.refresh_token},
                timeout=self.timeout,
                verify=self.verify_ssl,
            )
            if res.status_code == 200:
                data = res.json()
                self.access_token = data.get("access_token")
                if data.get("refresh_token"):
                    self.refresh_token = data.get("refresh_token")
                logger.info("MOSDAC access token refreshed successfully.")
                return True
        except Exception as e:
            logger.warning("Failed to refresh MOSDAC token: %s", e)
        return False

    def list_available_products(
        self,
        dataset_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        bounding_box: Optional[str] = None,
        max_records: int = 100,
        start_index: int = 1,
    ) -> Dict[str, Any]:
        """
        Query the official MOSDAC search endpoint (/apios/datasets.json).
        Does NOT require authentication for open metadata queries.
        """
        if not dataset_id:
            return {
                "success": False,
                "error": "MISSING_DATASET_ID",
                "message": "dataset_id parameter is required (e.g. 3RIMG_L1B_STD, 3RIMG_L2B_HEM)",
            }

        url = f"{self.base_url}{self.SEARCH_ENDPOINT}"
        params: Dict[str, Any] = {
            "datasetId": dataset_id,
            "startIndex": start_index,
        }

        if start_date:
            params["startTime"] = start_date
        if end_date:
            params["endTime"] = end_date
        if bounding_box:
            params["boundingBox"] = bounding_box
        if max_records:
            params["count"] = max_records

        try:
            logger.info("Querying MOSDAC catalog for %s (dates: %s to %s)", dataset_id, start_date, end_date)
            res = requests.get(url, params=params, timeout=self.timeout, verify=self.verify_ssl)

            if res.status_code == 200:
                data = res.json()
                total_results = data.get("totalResults", 0)
                total_size_mb = data.get("totalSizeMB", 0.0)
                items_per_page = data.get("itemsPerPage", 0)
                entries = data.get("entries", [])

                formatted_entries = []
                for entry in entries:
                    formatted_entries.append({
                        "id": entry.get("id"),
                        "identifier": entry.get("identifier"),
                        "updated": entry.get("updated"),
                        "size_bytes": entry.get("size", 0),
                        "summary": entry.get("summary", ""),
                        "dataset_id": dataset_id,
                    })

                return {
                    "success": True,
                    "dataset_id": dataset_id,
                    "total_results": total_results,
                    "total_size_mb": total_size_mb,
                    "items_per_page": items_per_page,
                    "entries_count": len(formatted_entries),
                    "entries": formatted_entries,
                }

            if res.status_code in [400, 404]:
                err_msg = "Unknown error from MOSDAC catalog."
                try:
                    err_msg = res.json().get("message", [err_msg])[0]
                except Exception:
                    pass
                return {
                    "success": False,
                    "error": "DATASET_NOT_FOUND",
                    "status_code": res.status_code,
                    "message": f"Dataset query failed: {err_msg}",
                }

            return {
                "success": False,
                "error": f"MOSDAC_HTTP_{res.status_code}",
                "status_code": res.status_code,
                "message": f"Catalog query returned status {res.status_code}",
            }

        except (requests.ConnectionError, requests.Timeout) as e:
            logger.error("Network error while querying MOSDAC catalog: %s", type(e).__name__)
            return {
                "success": False,
                "error": "NETWORK_UNREACHABLE",
                "message": "Cannot reach MOSDAC catalog API. Check network connectivity.",
            }
        except Exception as e:
            return {
                "success": False,
                "error": "SEARCH_ERROR",
                "message": str(e),
            }

    def download_granule(
        self,
        record_id: str,
        identifier: str,
        output_dir: str = "data/raw/insat3dr",
        prod_date: Optional[str] = None,
        organize_by_date: bool = True,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """
        Download a single granule file using its record_id.
        Requires active access_token.
        """
        if not self.access_token:
            auth_res = self.authenticate()
            if not auth_res.get("success"):
                return {
                    "success": False,
                    "error": "MOSDAC_AUTH_REQUIRED",
                    "message": "Authentication required to download MOSDAC files. " + auth_res.get("message", ""),
                }

        # Resolve destination path
        target_dir = Path(output_dir)
        if organize_by_date and prod_date:
            try:
                date_obj = datetime.strptime(prod_date, "%Y-%m-%dT%H:%M:%SZ")
                year = date_obj.strftime("%Y")
                month_day = date_obj.strftime("%d%b").upper()
                target_dir = target_dir / year / month_day
            except Exception:
                pass

        target_dir.mkdir(parents=True, exist_ok=True)
        dest_file = target_dir / identifier

        if dest_file.exists() and dest_file.stat().st_size > 0:
            logger.info("File already exists: %s (%d bytes). Skipping.", dest_file.name, dest_file.stat().st_size)
            return {
                "success": True,
                "status": "ALREADY_EXISTS",
                "file_path": str(dest_file),
                "file_size": dest_file.stat().st_size,
                "identifier": identifier,
            }

        url = f"{self.base_url}{self.DOWNLOAD_ENDPOINT}"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        params = {"id": record_id}

        for attempt in range(1, max_retries + 1):
            try:
                logger.info("Downloading %s (attempt %d/%d)...", identifier, attempt, max_retries)
                res = requests.get(
                    url,
                    headers=headers,
                    params=params,
                    stream=True,
                    timeout=30,
                    verify=self.verify_ssl,
                )

                if res.status_code == 200:
                    temp_file = dest_file.with_suffix(dest_file.suffix + ".part")
                    downloaded_bytes = 0
                    with open(temp_file, "wb") as f:
                        for chunk in res.iter_content(chunk_size=65536):
                            if chunk:
                                f.write(chunk)
                                downloaded_bytes += len(chunk)
                    temp_file.replace(dest_file)

                    # Scientific integrity verification
                    validation = self.verify_downloaded_file(dest_file)
                    if not validation.get("valid"):
                        logger.warning("Downloaded file failed verification: %s. Error: %s", dest_file.name, validation.get("error"))
                        return {
                            "success": False,
                            "error": "CORRUPTED_DOWNLOAD",
                            "file_path": str(dest_file),
                            "validation": validation,
                        }

                    logger.info("Successfully downloaded and verified: %s (%d bytes)", dest_file.name, downloaded_bytes)
                    return {
                        "success": True,
                        "status": "DOWNLOADED",
                        "file_path": str(dest_file),
                        "file_size": downloaded_bytes,
                        "identifier": identifier,
                        "validation": validation,
                    }

                elif res.status_code == 401:
                    logger.warning("Access token expired. Refreshing token...")
                    if self.refresh_access_token():
                        headers["Authorization"] = f"Bearer {self.access_token}"
                        continue
                    else:
                        return {"success": False, "error": "MOSDAC_AUTH_FAILED", "message": "Failed to refresh expired token"}

                elif res.status_code == 429:
                    logger.warning("MOSDAC rate limit reached (429). Waiting before retry...")
                    time.sleep(5 * attempt)
                    continue

                elif res.status_code == 404:
                    return {"success": False, "error": "FILE_NOT_FOUND", "message": f"File {identifier} not found on MOSDAC server"}

                else:
                    logger.warning("MOSDAC download HTTP status: %d", res.status_code)

            except (requests.ConnectionError, requests.Timeout) as e:
                logger.warning("Network interruption during download (attempt %d): %s", attempt, e)
                time.sleep(2 * attempt)
            except Exception as e:
                logger.error("Download exception: %s", e)
                time.sleep(2)

        return {
            "success": False,
            "error": "DOWNLOAD_FAILED",
            "message": f"Failed to download {identifier} after {max_retries} attempts.",
        }

    def batch_download(
        self,
        dataset_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        bounding_box: Optional[str] = None,
        output_dir: str = "data/raw/insat3dr",
        max_files: int = 50,
        organize_by_date: bool = True,
    ) -> Dict[str, Any]:
        """
        Batch download satellite files for a given dataset and spatiotemporal filter.
        Authenticates, searches, downloads, validates, and generates a manifest.
        """
        auth_res = self.authenticate()
        if not auth_res.get("success"):
            return {
                "success": False,
                "error": auth_res.get("error", "MOSDAC_AUTH_FAILED"),
                "message": auth_res.get("message", "Authentication required for batch download."),
            }

        search_res = self.list_available_products(
            dataset_id=dataset_id,
            start_date=start_date,
            end_date=end_date,
            bounding_box=bounding_box,
            max_records=max_files,
        )

        if not search_res.get("success"):
            return search_res

        entries = search_res.get("entries", [])
        if not entries:
            return {
                "success": True,
                "total_available": 0,
                "downloaded": 0,
                "skipped": 0,
                "failed": 0,
                "message": f"No files found for dataset {dataset_id} in requested range.",
                "files": [],
            }

        logger.info("Starting batch download of up to %d granules for %s", len(entries), dataset_id)

        results = []
        downloaded_count = 0
        skipped_count = 0
        failed_count = 0

        for idx, entry in enumerate(entries[:max_files], 1):
            rec_id = entry.get("id")
            identifier = entry.get("identifier")
            prod_date = entry.get("updated")

            dl_res = self.download_granule(
                record_id=rec_id,
                identifier=identifier,
                output_dir=output_dir,
                prod_date=prod_date,
                organize_by_date=organize_by_date,
            )

            results.append(dl_res)
            if dl_res.get("success"):
                if dl_res.get("status") == "ALREADY_EXISTS":
                    skipped_count += 1
                else:
                    downloaded_count += 1
            else:
                failed_count += 1

        # Generate manifest
        manifest = self.generate_manifest(output_dir)

        return {
            "success": True,
            "dataset_id": dataset_id,
            "total_found": len(entries),
            "processed": len(results),
            "downloaded": downloaded_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "manifest_path": manifest.get("manifest_file"),
            "results": results,
        }

    @staticmethod
    def verify_downloaded_file(file_path: Path) -> Dict[str, Any]:
        """
        Verify that a downloaded NetCDF4 / HDF5 / GeoTIFF file is scientifically valid:
        - Non-zero file size
        - Valid container header
        - Can be opened and inspected without corruption
        """
        path = Path(file_path)
        if not path.exists():
            return {"valid": False, "error": "FILE_DOES_NOT_EXIST"}

        size = path.stat().st_size
        if size == 0:
            return {"valid": False, "error": "EMPTY_FILE_ZERO_BYTES"}

        # Check HDF5 / NetCDF4 header
        suffix = path.suffix.lower()
        if suffix in [".h5", ".hdf", ".nc", ".nc4"]:
            try:
                import h5py
                with h5py.File(path, "r") as h5:
                    keys = list(h5.keys())
                    return {
                        "valid": True,
                        "format": "HDF5",
                        "size_bytes": size,
                        "root_keys": keys[:10],
                        "attrs_count": len(h5.attrs),
                    }
            except Exception as e_h5:
                # Try netCDF4
                try:
                    import netCDF4 as nc
                    with nc.Dataset(path, "r") as ds:
                        return {
                            "valid": True,
                            "format": "netCDF4",
                            "size_bytes": size,
                            "variables": list(ds.variables.keys())[:10],
                            "dimensions": list(ds.dimensions.keys()),
                        }
                except Exception as e_nc:
                    return {
                        "valid": False,
                        "error": f"CORRUPTED_HDF_NETCDF: h5py({e_h5}), netCDF4({e_nc})",
                    }

        # Check GeoTIFF
        if suffix in [".tif", ".tiff"]:
            try:
                # Basic check for TIFF header (II*\0 or MM\0*)
                with open(path, "rb") as f:
                    header = f.read(4)
                if header in [b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+"]:
                    return {"valid": True, "format": "GeoTIFF", "size_bytes": size}
                return {"valid": False, "error": "INVALID_TIFF_HEADER"}
            except Exception as e:
                return {"valid": False, "error": str(e)}

        return {"valid": True, "format": "raw_binary", "size_bytes": size}

    @staticmethod
    def generate_manifest(
        data_dir: str = "data/raw/insat3dr",
        manifest_path: Optional[str] = "data/manifests/insat3dr_manifest.json",
    ) -> Dict[str, Any]:
        """
        Generate or update an explicit manifest of all physical scientific files
        present in the dataset folder, recording file size, sha256 checksum,
        and validity.
        """
        folder = Path(data_dir)
        files: List[Path] = []
        if folder.exists():
            for ext in ["*.nc", "*.h5", "*.hdf", "*.tif", "*.csv", "*.nc4"]:
                files.extend(folder.glob(ext))
                files.extend(folder.glob(f"**/{ext}"))

        files = sorted(list(set([f for f in files if f.is_file()])))

        file_records = []
        total_bytes = 0

        for f in files:
            size = f.stat().st_size
            total_bytes += size
            val = MOSDACClient.verify_downloaded_file(f)

            # Compute sha256
            h = hashlib.sha256()
            try:
                with open(f, "rb") as fp:
                    while chunk := fp.read(1048576):
                        h.update(chunk)
                sha = h.hexdigest()
            except Exception:
                sha = "unreadable"

            file_records.append({
                "filename": f.name,
                "relative_path": str(f.relative_to(Path(".").resolve() if f.is_absolute() else Path("."))),
                "size_bytes": size,
                "size_mb": round(size / (1024 * 1024), 2),
                "sha256": sha,
                "valid": val.get("valid", False),
                "format": val.get("format", "unknown"),
                "modified_iso": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            })

        manifest = {
            "dataset": "insat3dr",
            "source": "MOSDAC (ISRO SAC)",
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "directory": str(folder),
            "total_files": len(file_records),
            "total_size_mb": round(total_bytes / (1024 * 1024), 2),
            "valid_files_count": sum(1 for r in file_records if r["valid"]),
            "files": file_records,
        }

        if manifest_path:
            m_path = Path(manifest_path)
            m_path.parent.mkdir(parents=True, exist_ok=True)
            with open(m_path, "w", encoding="utf-8") as out:
                json.dump(manifest, out, indent=2)
            manifest["manifest_file"] = str(m_path)

        return manifest
