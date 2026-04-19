// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract EnergyCertificate is ERC721, Ownable {
    struct CertificateData {
        address buyer;
        address producer;
        uint256 kwhAmount;
        uint256 priceWei;
        uint256 tradeId;
        uint256 issuedAt;
    }

    uint256 private _tokenIdCounter;
    address public authorizedMinter;

    mapping(uint256 => CertificateData) public certificates;
    mapping(address => uint256[]) private _ownerCertificates;

    event CertificateIssued(uint256 tokenId, address buyer, uint256 kwhAmount, uint256 tradeId);

    error NotAuthorizedMinter();
    error InvalidMinterAddress();
    error InvalidCertificateOwner();
    error CertificateNotFound();

    constructor() ERC721("SolarChain Energy Certificate", "SCEC") Ownable(msg.sender) {}

    modifier onlyAuthorizedMinter() {
        if (msg.sender != authorizedMinter) {
            revert NotAuthorizedMinter();
        }
        _;
    }

    function setAuthorizedMinter(address minter) external onlyOwner {
        if (minter == address(0)) {
            revert InvalidMinterAddress();
        }
        authorizedMinter = minter;
    }

    function mint(address to, CertificateData calldata data) external onlyAuthorizedMinter returns (uint256 tokenId) {
        if (to == address(0) || data.buyer != to) {
            revert InvalidCertificateOwner();
        }

        tokenId = ++_tokenIdCounter;
        _safeMint(to, tokenId);

        certificates[tokenId] = CertificateData({
            buyer: data.buyer,
            producer: data.producer,
            kwhAmount: data.kwhAmount,
            priceWei: data.priceWei,
            tradeId: data.tradeId,
            issuedAt: data.issuedAt
        });

        _ownerCertificates[to].push(tokenId);

        emit CertificateIssued(tokenId, to, data.kwhAmount, data.tradeId);
    }

    function getCertificate(uint256 tokenId) external view returns (CertificateData memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert CertificateNotFound();
        }
        return certificates[tokenId];
    }

    function getCertificatesByOwner(address owner) external view returns (uint256[] memory) {
        return _ownerCertificates[owner];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert CertificateNotFound();
        }

        CertificateData memory cert = certificates[tokenId];

        string memory json = string(
            abi.encodePacked(
                '{"name":"Certificat Energie Verte #',
                Strings.toString(tokenId),
                '","description":"Certifie l\'achat de ',
                Strings.toString(cert.kwhAmount),
                ' kWh d\'energie solaire",',
                '"attributes":[',
                '{"trait_type":"kWh","value":',
                Strings.toString(cert.kwhAmount),
                '},',
                '{"trait_type":"Producteur","value":"',
                Strings.toHexString(uint160(cert.producer), 20),
                '"},',
                '{"trait_type":"Prix ETH","value":"',
                _formatEth(cert.priceWei),
                '"},',
                '{"trait_type":"Date","value":"',
                Strings.toString(cert.issuedAt),
                '"}',
                ']}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // Soulbound: only minting (from address(0)) is allowed.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            revert("EnergyCertificate: non transferable");
        }
        return super._update(to, tokenId, auth);
    }

    function _formatEth(uint256 weiAmount) private pure returns (string memory) {
        uint256 whole = weiAmount / 1e18;
        uint256 fraction = (weiAmount % 1e18) / 1e12;

        string memory fractionStr = Strings.toString(fraction);
        bytes memory fractionBytes = bytes(fractionStr);
        if (fractionBytes.length < 6) {
            bytes memory padded = new bytes(6);
            uint256 zeros = 6 - fractionBytes.length;
            for (uint256 i = 0; i < zeros; i++) {
                padded[i] = "0";
            }
            for (uint256 i = 0; i < fractionBytes.length; i++) {
                padded[zeros + i] = fractionBytes[i];
            }
            fractionStr = string(padded);
        }

        return string(abi.encodePacked(Strings.toString(whole), ".", fractionStr));
    }
}
